const loadUsersAdmin = async () => {
    const pageEl = document.getElementById('users-admin');
    const listEl = document.getElementById('users-list');
    const messageEl = document.getElementById('users-message');
    const prevEl = document.getElementById('users-prev');
    const nextEl = document.getElementById('users-next');
    const pageLabelEl = document.getElementById('users-page');
    const currentUserId = pageEl.dataset.currentUserId;
    const isAdmin = pageEl.dataset.isAdmin === 'true';

    // Users on the current page, keyed by id. Saves and deletes update this map and
    // render the list again, so the page never reloads.
    const users = new Map();
    let editingId = null;
    let currentPage = 1;
    let totalPages = 1;

    const cell = (content) => {
        const td = document.createElement('td');
        td.append(content);
        return td;
    };

    const button = (label, onClick) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.textContent = label;
        el.addEventListener('click', onClick);
        return el;
    };

    const input = (value) => {
        const el = document.createElement('input');
        el.value = value;
        return el;
    };

    const saveUser = async (id, body) => {
        const response = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            messageEl.textContent = 'Unable to save the user.';
            return;
        }
        const updated = await response.json();
        users.set(updated.id, updated);
        editingId = null;
        messageEl.textContent = 'Saved.';
        render();
    };

    const deleteUser = async (id) => {
        if (!window.confirm('Delete this user?')) {
            return;
        }
        const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            messageEl.textContent = 'Unable to delete the user.';
            return;
        }
        if (id === currentUserId) {
            window.location.href = '/';
            return;
        }
        // Reload the page so the totals and the next user move up into the list.
        await loadPage(currentPage);
        messageEl.textContent = 'User deleted.';
    };

    const render = () => {
        listEl.replaceChildren(...[...users.values()].map((user) => {
            const row = document.createElement('tr');

            if (user.id !== editingId) {
                const actions = document.createElement('div');
                actions.append(
                    button('Edit', () => { editingId = user.id; render(); }),
                    button('Delete', () => deleteUser(user.id))
                );
                row.append(cell(user.name), cell(user.username), cell(user.email), cell(user.role), cell(actions));
                return row;
            }

            const nameInput = input(user.name);
            const usernameInput = input(user.username);
            const emailInput = input(user.email);
            const roleInput = input(user.role);
            roleInput.disabled = !isAdmin;

            const actions = document.createElement('div');
            actions.append(
                button('Save', () => saveUser(user.id, {
                    name: nameInput.value,
                    username: usernameInput.value,
                    email: emailInput.value,
                    ...(isAdmin && { role: roleInput.value })
                })),
                // Nothing was sent to the API, so just show the list again.
                button('Cancel', () => { editingId = null; render(); })
            );
            row.append(cell(nameInput), cell(usernameInput), cell(emailInput), cell(roleInput), cell(actions));
            return row;
        }));
    };

    // Fetches one page of users from the API and updates the table and pager.
    const loadPage = async (page) => {
        try {
            // Send the page plus any filters the user picked.
            const params = new URLSearchParams({ page });
            const role = document.getElementById('users-role').value;
            const q = document.getElementById('users-q').value.trim();
            if (role) params.set('role', role);
            if (q) params.set('q', q);

            const response = await fetch(`/api/users?${params}`);
            if (!response.ok) {
                throw new Error(`Failed to load users (${response.status})`);
            }
            const result = await response.json();

            // If the last user on the last page was deleted, step back a page.
            if (result.data.length === 0 && page > 1) {
                await loadPage(page - 1);
                return;
            }

            users.clear();
            result.data.forEach((user) => users.set(user.id, user));
            currentPage = result.page;
            totalPages = Math.max(result.totalPages, 1);
            editingId = null;

            pageLabelEl.textContent = `Page ${currentPage} of ${totalPages}`;
            prevEl.disabled = currentPage <= 1;
            nextEl.disabled = currentPage >= totalPages;
            messageEl.textContent = result.total === 0 ? 'No users found.' : '';
            render();
        } catch (error) {
            messageEl.textContent = 'Unable to load users right now.';
            console.error(error);
        }
    };

    prevEl.addEventListener('click', () => loadPage(currentPage - 1));
    nextEl.addEventListener('click', () => loadPage(currentPage + 1));

    // A new search always starts back on page 1.
    document.getElementById('users-filters').addEventListener('submit', (event) => {
        event.preventDefault();
        loadPage(1);
    });

    await loadPage(1);
};

document.addEventListener('DOMContentLoaded', loadUsersAdmin);
