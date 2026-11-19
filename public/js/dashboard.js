const loadMyBookings = async () => {
    const listEl = document.getElementById('my-bookings-list');
    const messageEl = document.getElementById('my-bookings-message');

    try {
        const response = await fetch('/api/bookings/mine');
        if (!response.ok) {
            throw new Error(`Failed to load bookings (${response.status})`);
        }

        const bookings = await response.json();

        listEl.replaceChildren(...bookings.map((booking) => {
            const row = document.createElement('tr');
            [booking.id, booking.tripId, booking.selectedDay, booking.ticketClass].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value ?? '';
                row.appendChild(cell);
            });
            return row;
        }));

        messageEl.textContent = bookings.length === 0 ? 'You have no bookings yet.' : '';
    } catch (error) {
        messageEl.textContent = 'Unable to load your bookings right now.';
        console.error(error);
    }
};

document.addEventListener('DOMContentLoaded', loadMyBookings);
