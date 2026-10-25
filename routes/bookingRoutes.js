import express from 'express';
import { cancelBooking, createBooking, getMyBookings } from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('client'), createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.patch('/:bookingId/cancel', protect, authorize('client'), cancelBooking);

export default router;