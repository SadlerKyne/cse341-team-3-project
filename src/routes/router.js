import tripsEjsRouter from './ejs-routes.js';
import apiRouter from './api-routes.js';
import { trainsApi, trainsPage } from './trains.js';
import { Router } from 'express';
import usersRouter from './users.js';
import { homePage, aboutPage, loginPage, registerPage, testErrorPage } from './index.js';
import { login, logout, register } from '../controllers/auth.js';
import { getAllBookings, getMyBookings, bookingsAdminPage } from '../controllers/bookings.js';
import { adminDashboardPage, userDashboardPage } from '../controllers/dashboard.js';
import { requireApiLogin, requireApiRole, requirePageLogin, requirePageRole } from '../middleware/auth.js';

const router = Router();

// Home page
router.get('/', homePage);

// About page
router.get('/about', aboutPage);

// Authentication pages
router.get('/register', registerPage);
router.get('/login', loginPage);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Dashboards
router.get('/dashboard', requirePageLogin, userDashboardPage);
router.get('/admin', requirePageRole('admin'), adminDashboardPage);

// Trains page
router.get('/trains', trainsPage);

// Trains API
router.get('/api/trains', trainsApi);

// Trips API
router.use('/api', apiRouter);

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get one page of bookings, sorted by booking date (newest first)
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *       - in: query
 *         name: ticketClass
 *         schema: { type: string, enum: [standard, premium, first] }
 *       - in: query
 *         name: from
 *         description: Only bookings made on or after this date (YYYY-MM-DD, UTC)
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         description: Only bookings made on or before this date (YYYY-MM-DD, UTC). The whole day is included.
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: One page of bookings (data is an empty array if there are none)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page: { type: integer, example: 1 }
 *                 limit: { type: integer, example: 10 }
 *                 total: { type: integer, example: 12 }
 *                 totalPages: { type: integer, example: 2 }
 *                 filters:
 *                   type: object
 *                   example: { ticketClass: first, from: '2026-11-01', to: '2026-11-30' }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: JR1W5AFH9O
 *                       scheduleId:
 *                         type: integer
 *                         example: 1
 *                       tripId:
 *                         type: string
 *                         example: alpine-panorama
 *                       ticketClass:
 *                         type: string
 *                         example: premium
 *                       selectedDay:
 *                         type: string
 *                         example: monday
 *                       passengers:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             firstName:
 *                               type: string
 *                             lastName:
 *                               type: string
 *                             email:
 *                               type: string
 *                             phone:
 *                               type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid page, limit, ticketClass, from, or to (or from is after to)
 *       500:
 *         description: Failed to fetch bookings
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden
 */
router.get('/api/bookings', requireApiRole('admin'), getAllBookings);

/**
 * @swagger
 * /api/bookings/mine:
 *   get:
 *     summary: Get bookings where the signed-in user's email matches a passenger
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: The user's bookings, newest first
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to fetch bookings
 */
router.get('/api/bookings/mine', requireApiLogin, getMyBookings);

// Bookings admin page
router.get('/bookings-admin', requirePageRole('admin'), bookingsAdminPage);

// Rail trips
router.use('/trips', tripsEjsRouter);

// User admin page and API
router.use(usersRouter);

// Test 500 error page
router.get('/500', testErrorPage);

export default router;