const loadUsersAdmin = async () => {
    const pageEl = document.getElementById('users-admin');
    const listEl = document.getElementById('users-list');
    const messageEl = document.getElementById('users-message');
    const currentUserId = pageEl.dataset.currentUserId;
    const isAdmin = pageEl.dataset.isAdmin === 'true';

    // Users from the API, keyed by id. Saves and deletes update this map and
    // render the list again, so the page never reloads.
    const users = new Map();
    let editingId = null;

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
        users.delete(id);
        messageEl.textContent = 'User deleted.';
        render();
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
                row.append(cell(user.name), cell(user.email), cell(user.role), cell(actions));
                return row;
            }

            const nameInput = input(user.name);
            const emailInput = input(user.email);
            const roleInput = input(user.role);
            roleInput.disabled = !isAdmin;

            const actions = document.createElement('div');
            actions.append(
                button('Save', () => saveUser(user.id, {
                    name: nameInput.value,
                    email: emailInput.value,
                    ...(isAdmin && { role: roleInput.value })
                })),
                // Nothing was sent to the API, so just show the list again.
                button('Cancel', () => { editingId = null; render(); })
            );
            row.append(cell(nameInput), cell(emailInput), cell(roleInput), cell(actions));
            return row;
        }));
    };

    try {
        const response = await fetch('/api/users');
        if (!response.ok) {
            throw new Error(`Failed to load users (${response.status})`);
        }
        (await response.json()).forEach((user) => users.set(user.id, user));
        messageEl.textContent = '';
        render();
    } catch (error) {
        messageEl.textContent = 'Unable to load users right now.';
        console.error(error);
    }
};

document.addEventListener('DOMContentLoaded', loadUsersAdmin);
