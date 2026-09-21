import express from 'express';
import { createBooking, getMyBookings } from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('client'), createBooking);
router.get('/my-bookings', protect, getMyBookings);

export default router;