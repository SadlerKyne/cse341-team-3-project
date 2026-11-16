const hookTripsCatalog = async () => {
    const listEl = document.getElementById('trips-list');
    const templateEl = document.getElementById('trip-card-template');
    const loadingEl = document.getElementById('trips-loading');
    const errorEl = document.getElementById('trips-error');
    const emptyEl = document.getElementById('trips-empty');
    const regionSelect = document.getElementById('region-filter');
    const seasonSelect = document.getElementById('season-filter');

    if (!listEl || !templateEl || !regionSelect || !seasonSelect) {
        return;
    }

    const formatLabel = (value) => value.charAt(0).toUpperCase() + value.slice(1);
    const populateFilter = (select, values, defaultLabel, selectedValue) => {
        const options = [new Option(defaultLabel, 'all')];
        values.forEach((value) => options.push(new Option(formatLabel(value), value)));
        select.replaceChildren(...options);
        select.value = values.includes(selectedValue) ? selectedValue : 'all';
    };

    const renderTrips = (trips) => {
        const selectedRegion = regionSelect.value;
        const selectedSeason = seasonSelect.value;
        const filteredTrips = trips.filter((trip) =>
            (selectedRegion === 'all' || trip.region === selectedRegion) &&
            (selectedSeason === 'all' || trip.bestSeason === selectedSeason)
        );
        const fragment = document.createDocumentFragment();

        filteredTrips.forEach((trip) => {
            const card = templateEl.content.cloneNode(true);
            const cardEl = card.querySelector('.route-card');
            const setField = (field, value) => {
                card.querySelector(`[data-field="${field}"]`).textContent = value ?? '';
            };
            const seasonEl = card.querySelector('[data-field="season"]');
            const highlightsEl = card.querySelector('[data-field="highlights"]');
            const detailsLink = card.querySelector('[data-field="details-link"]');

            if (typeof trip.region === 'string' && /^[a-z0-9_-]+$/i.test(trip.region)) {
                cardEl.classList.add(trip.region);
            }

            setField('name', trip.name);
            setField('region', trip.region);
            setField('start-station', trip.startStation);
            setField('end-station', trip.endStation);
            setField('duration', trip.duration);
            setField('distance', trip.distance);
            setField('description', trip.description);

            if (typeof trip.bestSeason === 'string' && /^[a-z0-9_-]+$/i.test(trip.bestSeason)) {
                seasonEl.textContent = `Best in ${trip.bestSeason}`;
                seasonEl.classList.add(`season-${trip.bestSeason}`);
            } else {
                seasonEl.parentElement.hidden = true;
            }

            if (Array.isArray(trip.highlights)) {
                trip.highlights.forEach((highlight) => {
                    const tag = document.createElement('span');
                    tag.className = 'highlight-tag';
                    tag.textContent = highlight;
                    highlightsEl.appendChild(tag);
                });
            }

            detailsLink.href = `/trips/${encodeURIComponent(trip.id)}`;
            fragment.appendChild(card);
        });

        listEl.replaceChildren(fragment);
        emptyEl.hidden = filteredTrips.length > 0;
    };

    try {
        const response = await fetch('/api/trips');
        if (!response.ok) {
            throw new Error(`Failed to load trips (${response.status})`);
        }

        const trips = await response.json();
        if (!Array.isArray(trips)) {
            throw new Error('Trip API returned an invalid response');
        }

        const url = new URL(window.location.href);
        populateFilter(regionSelect, [...new Set(trips
            .map((trip) => trip.region)
            .filter((region) => typeof region === 'string' && region))].sort(),
            'All Regions', url.searchParams.get('region'));
        populateFilter(seasonSelect, [...new Set(trips
            .map((trip) => trip.bestSeason)
            .filter((season) => typeof season === 'string' && season))].sort(),
            'Any Season', url.searchParams.get('season'));

        const applyFilters = () => {
            const currentUrl = new URL(window.location.href);
            for (const [parameter, value] of [
                ['region', regionSelect.value],
                ['season', seasonSelect.value]
            ]) {
                if (value === 'all') {
                    currentUrl.searchParams.delete(parameter);
                } else {
                    currentUrl.searchParams.set(parameter, value);
                }
            }

            window.history.replaceState({}, '', currentUrl);
            renderTrips(trips);
        };

        regionSelect.addEventListener('change', applyFilters);
        seasonSelect.addEventListener('change', applyFilters);
        renderTrips(trips);
        loadingEl.hidden = true;
    } catch (error) {
        loadingEl.hidden = true;
        errorEl.hidden = false;
        errorEl.textContent = 'Unable to load trips right now. Please try again in a moment.';
        console.error('Error loading trips:', error);
    }
};

const hookTrainsCatalog = async () => {
    const listEl = document.getElementById('trains-list');
    const templateEl = document.getElementById('train-card-template');
    const loadingEl = document.getElementById('trains-loading');
    const errorEl = document.getElementById('trains-error');

    if (!listEl || !templateEl) {
        return;
    }

    try {
        const response = await fetch('/api/trains');
        if (!response.ok) {
            throw new Error(`Failed to load trains (${response.status})`);
        }

        const payload = await response.json();
        const trains = payload.trains || [];
        const fragment = document.createDocumentFragment();

        trains.forEach((train) => {
            const card = templateEl.content.cloneNode(true);
            const imageEl = card.querySelector('[data-field="image"]');

            imageEl.src = train.imageUrl;
            imageEl.alt = train.imageAlt || `${train.name} train`;

            card.querySelector('[data-field="name"]').textContent = train.name;
            card.querySelector('[data-field="operator"]').textContent = train.operator;
            card.querySelector('[data-field="type"]').textContent = train.type;
            card.querySelector('[data-field="speed"]').textContent = `${train.maxSpeedKmh} km/h`;
            card.querySelector('[data-field="seats"]').textContent = `${train.capacity} seats`;
            card.querySelector('[data-field="power"]').textContent = train.powerSource;
            card.querySelector('[data-field="description"]').textContent = train.description;
            card.querySelector('[data-field="best-for"]').textContent = train.bestFor;

            fragment.appendChild(card);
        });

        listEl.replaceChildren(fragment);
        if (loadingEl) {
            loadingEl.hidden = true;
        }
    } catch (error) {
        if (loadingEl) {
            loadingEl.hidden = true;
        }
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = 'Unable to load trains right now. Please try again in a moment.';
        }
    }
};

const hookTripSchedules = () => {
    const containerEl = document.getElementById('trip-schedules');
    const listEl = document.getElementById('schedules-list');
    const templateEl = document.getElementById('schedule-card-template');
    const monthSelect = document.getElementById('schedule-month');
    const loadingEl = document.getElementById('schedules-loading');
    const errorEl = document.getElementById('schedules-error');
    const emptyEl = document.getElementById('schedules-empty');

    if (!containerEl || !listEl || !templateEl || !monthSelect) {
        return;
    }

    const tripId = containerEl.dataset.tripId;

    const renderSchedules = (schedules) => {
        const fragment = document.createDocumentFragment();

        schedules.forEach((schedule) => {
            const card = templateEl.content.cloneNode(true);
            const daysEl = card.querySelector('[data-field="days"]');

            card.querySelector('[data-field="departure"]').textContent = schedule.departureTime;
            card.querySelector('[data-field="arrival"]').textContent = schedule.arrivalTime;

            (schedule.daysOfWeek || []).forEach((day) => {
                const badge = document.createElement('span');
                badge.className = 'day-badge';
                badge.textContent = day.substring(0, 3);
                daysEl.appendChild(badge);
            });

            card.querySelector('[data-field="book-link"]').href =
                `/trips/booking/${encodeURIComponent(schedule.id)}`;
            fragment.appendChild(card);
        });

        listEl.replaceChildren(fragment);
        emptyEl.hidden = schedules.length > 0;
    };

    const loadSchedules = async () => {
        const month = monthSelect.value;
        let url = `/api/trips/${encodeURIComponent(tripId)}/schedules`;
        if (month !== 'all') {
            url += `?month=${encodeURIComponent(month)}`;
        }

        loadingEl.hidden = false;
        errorEl.hidden = true;
        emptyEl.hidden = true;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load schedules (${response.status})`);
            }

            const schedules = await response.json();
            if (!Array.isArray(schedules)) {
                throw new Error('Schedule API returned an invalid response');
            }

            renderSchedules(schedules);
        } catch (error) {
            listEl.replaceChildren();
            errorEl.hidden = false;
            errorEl.textContent = 'Unable to load schedules right now. Please try again in a moment.';
            console.error('Error loading schedules:', error);
        } finally {
            loadingEl.hidden = true;
        }
    };

    monthSelect.addEventListener('change', loadSchedules);
    loadSchedules();
};

document.addEventListener('DOMContentLoaded', () => {
    hookTripsCatalog();
    hookTrainsCatalog();
    hookTripSchedules();
});