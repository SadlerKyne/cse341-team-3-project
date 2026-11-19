import { Router } from 'express';
import { deleteUser, getUsers, updateUser, usersAdminPage } from '../controllers/users.js';
import { requireApiLogin, requirePageLogin } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Admins get all users; other users get only themselves
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: A list of users (id, name, email, role)
 *       401:
 *         description: Authentication required
 * /api/users/{id}:
 *   put:
 *     summary: Update a user's name and email (admins can also change role). Users can only update themselves.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: The updated user
 *       400:
 *         description: Missing name or email, or invalid role
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
