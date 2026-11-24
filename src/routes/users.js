import { Router } from 'express';
import { deleteUser, getUsers, updateUser, usersAdminPage } from '../controllers/users.js';
import { requireApiLogin, requirePageLogin } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get one page of users, sorted by username. Admins get all users; other users get only themselves
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [customer, admin] }
 *       - in: query
 *         name: q
 *         description: Case-insensitive keyword matched against display name, username, or email
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: One page of users (id, name, username, email, role). Password hashes are never returned.
 *         content:
 *           application/json:
 *             example:
 *               data: [{ id: '665f1c...', name: Maya, username: maya, email: maya@example.com, role: customer }]
 *               page: 1
 *               limit: 10
 *               total: 1
 *               totalPages: 1
 *               filters: { role: customer, q: maya }
 *       400:
 *         description: Invalid page, limit, role, or q
 *       401:
 *         description: Authentication required
 * /api/users/{id}:
 *   put:
 *     summary: Update a user's name, username, and email (admins can also change role). Users can only update themselves.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: The updated user
 *       400:
 *         description: Missing name, username, or email, or invalid role
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *   delete:
 *     summary: Delete a user. Users can only delete themselves.
 *     tags: [Users]
 *     responses:
 *       204:
 *         description: User deleted
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get('/api/users', requireApiLogin, getUsers);
router.put('/api/users/:id', requireApiLogin, updateUser);
router.delete('/api/users/:id', requireApiLogin, deleteUser);

// User admin page
router.get('/users-admin', requirePageLogin, usersAdminPage);

export default router;
