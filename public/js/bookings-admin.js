const loadBookingsAdmin = async () => {
    const tableEl = document.getElementById('bookings-table');
    const listEl = document.getElementById('bookings-list');
    const templateEl = document.getElementById('booking-row-template');
    const loadingEl = document.getElementById('bookings-loading');
    const errorEl = document.getElementById('bookings-error');
    const emptyEl = document.getElementById('bookings-empty');

    if (!tableEl || !listEl || !templateEl) {
        return;
    }

    const formatLabel = (value) =>
        typeof value === 'string' && value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

    try {
        const response = await fetch('/api/bookings');
        if (!response.ok) {
            throw new Error(`Failed to load bookings (${response.status})`);
        }

        const bookings = await response.json();
        if (!Array.isArray(bookings)) {
            throw new Error('Bookings API returned an invalid response');
        }

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
    } catch (error) {
        errorEl.hidden = false;
        errorEl.textContent = 'Unable to load bookings right now. Please try again in a moment.';
        console.error('Error loading bookings:', error);
    } finally {
        loadingEl.hidden = true;
    }
};

document.addEventListener('DOMContentLoaded', loadBookingsAdmin);
