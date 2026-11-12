import {
    bookingPage,
    processBookingRequest,
    bookingConfirmationPage
} from '../controllers/bookings.js';
import { listTripsPage, tripDetailsPage } from '../controllers/trips.js';
import { Router } from 'express';

const router = Router();

router.get('/', listTripsPage);
router.get('/:tripId', tripDetailsPage);
router.get('/booking/:scheduleId', bookingPage);
router.post('/book', processBookingRequest);
router.get('/confirmation/:bookingId', bookingConfirmationPage);

export default router;
