import { Router } from 'express';
import { getDb } from '../db/connect.js';

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

export default router;