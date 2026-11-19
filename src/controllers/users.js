import { deleteUser as removeUser, getAllUsers, getUserById, updateUser as saveUser } from '../models/users.js';

const isAdmin = (req) => req.user.role === 'admin';

// Users can only manage themselves. Admins can manage anyone.
const canManage = (req, id) => isAdmin(req) || req.user.id === id;

// GET /users-admin
export function usersAdminPage(req, res) {
  return res.render('users-admin', { title: 'User Admin' });
}

// GET /api/users
export async function getUsers(req, res) {
  try {
    if (isAdmin(req)) {
      return res.status(200).json(await getAllUsers());
    }
    const user = await getUserById(req.user.id);
    return res.status(200).json(user ? [user] : []);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// PUT /api/users/:id
export async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, role } = req.body ?? {};

  if (!canManage(req, id) || (role && !isAdmin(req))) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  if (role && !['customer', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be customer or admin' });
  }

  try {
    const user = await saveUser(id, { name: name.trim(), email: email.trim().toLowerCase(), role });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Keep the session up to date when users edit themselves.
    if (user.id === req.user.id) {
      req.session.user = { ...req.session.user, name: user.name, email: user.email, role: user.role };
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

// DELETE /api/users/:id
export async function deleteUser(req, res) {
  const { id } = req.params;

  if (!canManage(req, id)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    if (!(await removeUser(id))) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Users who delete their own account are signed out.
    if (id === req.user.id) {
      return req.session.destroy(() => res.status(204).end());
    }

    return res.status(204).end();
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}
