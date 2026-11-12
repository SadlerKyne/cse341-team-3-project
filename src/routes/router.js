import tripsEjsRouter from './ejs-routes.js';
import apiTripsRouter from './api-routes.js';
import { trainsApi, trainsPage } from './trains.js';
import { Router } from 'express';
import { homePage, aboutPage, testErrorPage } from './index.js';
import { getAllBookings, bookingsAdminPage } from '../controllers/bookings.js';

const router = Router();

// Home page
router.get('/', homePage);

// About page
router.get('/about', aboutPage);

// Trains page
router.get('/trains', trainsPage);

// Trains API
router.get('/api/trains', trainsApi);

// Trips API
router.use('/api/trips', apiTripsRouter);

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings, newest first
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: A list of bookings (an empty array if there are none)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: JR1W5AFH9O
 *                   scheduleId:
 *                     type: integer
 *                     example: 1
 *                   tripId:
 *                     type: string
 *                     example: alpine-panorama
 *                   ticketClass:
 *                     type: string
 *                     example: premium
 *                   selectedDay:
 *                     type: string
 *                     example: monday
 *                   passengers:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Failed to fetch bookings
 */
router.get('/api/bookings', getAllBookings);

// Bookings admin page
router.get('/bookings-admin', bookingsAdminPage);

// Rail trips
router.use('/trips', tripsEjsRouter);

// Test 500 error page
router.get('/500', testErrorPage);

export default router;