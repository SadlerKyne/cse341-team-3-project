import tripsEjsRouter from './ejs-routes.js';
import apiTripsRouter from './api-routes.js';
import { trainsApi, trainsPage } from './trains.js';
import { Router } from 'express';
import { homePage, aboutPage, testErrorPage } from './index.js';

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

// Rail trips
router.use('/trips', tripsEjsRouter);

// Test 500 error page
router.get('/500', testErrorPage);

export default router;