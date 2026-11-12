import { Router } from 'express';
import { getDb } from '../db/connect.js';
import { getSchedulesForTrip, getSchedulesForTripAndMonth } from '../controllers/schedules.js';

const router = Router();

/**
 * @swagger
 * /api/trips:
 *   get:
 *     summary: Get all trips
 *     tags: [Trips]
 *     responses:
 *       200:
 *         description: A list of trips
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Trip'
 *       500:
 *         description: Failed to fetch trips
 */
router.get('/', async (req, res, next) => {
    try {
        const trips = await getDb().collection('trips').find({}).toArray();
        return res.json(trips);
    } catch (error) {
        return next(error);
    }
});

/**
 * @swagger
 * /api/trips/{id}:
 *   get:
 *     summary: Get a trip by ID
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The trip ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The requested trip
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Trip'
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Failed to fetch trip
 */
router.get('/:id', async (req, res, next) => {
    try {
        const trip = await getDb().collection('trips').findOne({ id: req.params.id });
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        return res.json(trip);
    } catch (error) {
        return next(error);
    }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Schedule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         tripId:
 *           type: string
 *           example: alpine-panorama
 *         departureTime:
 *           type: string
 *           example: "08:30"
 *         arrivalTime:
 *           type: string
 *           example: "13:00"
 *         daysOfWeek:
 *           type: array
 *           items:
 *             type: string
 *           example: [monday, tuesday, wednesday]
 *         status:
 *           type: boolean
 *           example: true
 *
 * /api/trips/{id}/schedules:
 *   get:
 *     summary: Get the schedules for a trip, optionally for one month
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The trip ID
 *         schema:
 *           type: string
 *           example: alpine-panorama
 *       - in: query
 *         name: month
 *         required: false
 *         description: Month number (1-12). Returns an empty list if the trip does not run that month.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *     responses:
 *       200:
 *         description: The schedules for the trip (an empty array if there are none)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Schedule'
 *       400:
 *         description: month is not a whole number from 1 to 12
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Failed to fetch schedules
 */
router.get('/:id/schedules', (req, res) => {
    if (req.query.month !== undefined) {
        return getSchedulesForTripAndMonth(req, res);
    }

    return getSchedulesForTrip(req, res);
});

export default router;