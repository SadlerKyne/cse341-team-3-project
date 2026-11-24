const loadBookingsAdmin = async () => {
    const tableEl = document.getElementById('bookings-table');
    const listEl = document.getElementById('bookings-list');
    const templateEl = document.getElementById('booking-row-template');
    const loadingEl = document.getElementById('bookings-loading');
    const errorEl = document.getElementById('bookings-error');
    const emptyEl = document.getElementById('bookings-empty');
    const prevEl = document.getElementById('bookings-prev');
    const nextEl = document.getElementById('bookings-next');
    const pageLabelEl = document.getElementById('bookings-page');

    if (!tableEl || !listEl || !templateEl) {
        return;
    }

    const LOAD_ERROR = 'Unable to load bookings right now. Please try again in a moment.';
    let currentPage = 1;

    const formatLabel = (value) =>
        typeof value === 'string' && value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

    // Fetches one page of bookings from the API and updates the table and pager.
    const loadPage = async (page) => {
        loadingEl.hidden = false;
        errorEl.hidden = true;

        try {
            // Send the page plus any filters the user picked.
            const params = new URLSearchParams({ page });
            const filters = {
                ticketClass: document.getElementById('bookings-class').value,
                from: document.getElementById('bookings-from').value,
                to: document.getElementById('bookings-to').value
            };
            Object.entries(filters).forEach(([name, value]) => {
                if (value) params.set(name, value);
            });

            const response = await fetch(`/api/bookings?${params}`);
            const result = await response.json();
            if (!response.ok || !Array.isArray(result.data)) {
                // A 400 explains what is wrong with the filters, so show it to the user.
                throw new Error(response.status === 400 ? result.error : LOAD_ERROR);
            }
            const bookings = result.data;

            const fragment = document.createDocumentFragment();

            bookings.forEach((booking) => {
                const row = templateEl.content.cloneNode(true);
                const setField = (field, value) => {
                    row.querySelector(`[data-field="${field}"]`).textContent = value ?? '';
                };
                const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
                const idLink = row.querySelector('[data-field="id"]');

                idLink.textContent = booking.id;
                idLink.href = `/trips/confirmation/${encodeURIComponent(booking.id)}`;

                setField('created', booking.createdAt
                    ? new Date(booking.createdAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                    })
                    : '');
                setField('trip', booking.tripId);
                setField('schedule', booking.scheduleId);
                setField('day', formatLabel(booking.selectedDay));
                setField('ticket-class', formatLabel(booking.ticketClass));
                setField('passengers', passengers.length);
                setField('email', passengers[0]?.email);

                fragment.appendChild(row);
            });

            listEl.replaceChildren(fragment);
            tableEl.hidden = bookings.length === 0;
            emptyEl.hidden = bookings.length > 0;

            currentPage = result.page;
            const totalPages = Math.max(result.totalPages, 1);
            pageLabelEl.textContent = `Page ${currentPage} of ${totalPages}`;
            prevEl.disabled = currentPage <= 1;
            nextEl.disabled = currentPage >= totalPages;
        } catch (error) {
            errorEl.hidden = false;
            errorEl.textContent = error instanceof SyntaxError ? LOAD_ERROR : error.message;
            tableEl.hidden = true;
            emptyEl.hidden = true;
            console.error('Error loading bookings:', error);
        } finally {
            loadingEl.hidden = true;
        }
    };

    prevEl.addEventListener('click', () => loadPage(currentPage - 1));
    nextEl.addEventListener('click', () => loadPage(currentPage + 1));

    // New filters always start back on page 1.
    document.getElementById('bookings-filters').addEventListener('submit', (event) => {
        event.preventDefault();
        loadPage(1);
    });

    await loadPage(1);
};

document.addEventListener('DOMContentLoaded', loadBookingsAdmin);
