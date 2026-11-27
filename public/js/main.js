const hookTripsCatalog = async () => {
    const listEl = document.getElementById('trips-list');
    const templateEl = document.getElementById('trip-card-template');
    const loadingEl = document.getElementById('trips-loading');
    const errorEl = document.getElementById('trips-error');
    const emptyEl = document.getElementById('trips-empty');
    const regionSelect = document.getElementById('region-filter');
    const seasonSelect = document.getElementById('season-filter');
    const keywordInput = document.getElementById('trip-search');
    const paginationEl = document.getElementById('trips-pagination');
    const previousButton = document.getElementById('trips-previous');
    const nextButton = document.getElementById('trips-next');
    const pageStatus = document.getElementById('trips-page-status');
    if (!listEl || !templateEl || !regionSelect || !seasonSelect || !keywordInput ||
        !paginationEl || !previousButton ||
        !nextButton || !pageStatus) {
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
        const fragment = document.createDocumentFragment();

        trips.forEach((trip) => {
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
        emptyEl.hidden = trips.length > 0;
    };

    const initialUrl = new URL(window.location.href);
    const requestedPage = Number(initialUrl.searchParams.get('page'));
    let page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    let hasLoadedFilterOptions = false;
    let requestedRegion = initialUrl.searchParams.get('region');
    let requestedSeason = initialUrl.searchParams.get('season');
    keywordInput.value = initialUrl.searchParams.get('q') || '';
    let activeRequest;

    const updateUrl = () => {
        const currentUrl = new URL(window.location.href);
        for (const [parameter, value] of [
            ['region', regionSelect.value],
            ['season', seasonSelect.value],
            ['q', keywordInput.value.trim()]
        ]) {
            if (value === 'all' || !value) {
                currentUrl.searchParams.delete(parameter);
            } else {
                currentUrl.searchParams.set(parameter, value);
            }
        }

        if (page === 1) {
            currentUrl.searchParams.delete('page');
        } else {
            currentUrl.searchParams.set('page', page);
        }

        window.history.replaceState({}, '', currentUrl);
    };

    const loadTrips = async () => {
        if (activeRequest) {
            activeRequest.abort();
        }
        const request = new AbortController();
        activeRequest = request;
        const query = new URLSearchParams({ page: String(page), limit: '10' });
        const selectedRegion = hasLoadedFilterOptions ? regionSelect.value : requestedRegion;
        const selectedSeason = hasLoadedFilterOptions ? seasonSelect.value : requestedSeason;
        if (selectedRegion && selectedRegion !== 'all') {
            query.set('region', selectedRegion);
        }
        if (selectedSeason && selectedSeason !== 'all') {
            query.set('season', selectedSeason);
        }
        const keyword = keywordInput.value.trim();
        if (keyword) {
            query.set('q', keyword);
        }

        loadingEl.hidden = false;
        errorEl.hidden = true;
        emptyEl.hidden = true;
        try {
            const response = await fetch(`/api/trips?${query}`, { signal: request.signal });
            if (!response.ok) {
                throw new Error(`Failed to load trips (${response.status})`);
            }

            const result = await response.json();
            if (!result || !Array.isArray(result.data) ||
                !Number.isInteger(result.page) || !Number.isInteger(result.totalPages) ||
                !result.filterOptions || !Array.isArray(result.filterOptions.regions) ||
                !Array.isArray(result.filterOptions.seasons)) {
                throw new Error('Trip API returned an invalid response');
            }

            if (!hasLoadedFilterOptions) {
                const validRegion = result.filterOptions.regions.includes(requestedRegion);
                const validSeason = result.filterOptions.seasons.includes(requestedSeason);
                populateFilter(regionSelect, result.filterOptions.regions, 'All Regions', requestedRegion);
                populateFilter(seasonSelect, result.filterOptions.seasons, 'Any Season', requestedSeason);
                hasLoadedFilterOptions = true;
                requestedRegion = null;
                requestedSeason = null;
                if ((!validRegion && initialUrl.searchParams.has('region')) ||
                    (!validSeason && initialUrl.searchParams.has('season'))) {
                    page = 1;
                    loadTrips();
                    return;
                }
            }

            page = result.page;
            renderTrips(result.data);
            paginationEl.hidden = result.totalPages <= 1;
            previousButton.disabled = page <= 1;
            nextButton.disabled = page >= result.totalPages;
            pageStatus.textContent = `Page ${page} of ${result.totalPages} (${result.total} trips)`;
            updateUrl();
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }
            listEl.replaceChildren();
            paginationEl.hidden = true;
            errorEl.hidden = false;
            errorEl.textContent = 'Unable to load trips right now. Please try again in a moment.';
            console.error('Error loading trips:', error);
        } finally {
            if (activeRequest === request) {
                loadingEl.hidden = true;
            }
        }
    };

    const applyFilters = () => {
        page = 1;
        updateUrl();
        loadTrips();
    };

    regionSelect.addEventListener('change', applyFilters);
    seasonSelect.addEventListener('change', applyFilters);
    keywordInput.addEventListener('input', applyFilters);

    previousButton.addEventListener('click', () => {
        if (page > 1) {
            page -= 1;
            loadTrips();
        }
    });
    nextButton.addEventListener('click', () => {
        page += 1;
        loadTrips();
    });
    loadTrips();
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