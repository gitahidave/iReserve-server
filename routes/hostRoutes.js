import express from 'express';
import { getHostBookings } from '../controllers/bookingController.js';
import { getHostListings } from '../controllers/listingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('host', 'admin'));

router.get('/listings', getHostListings);
router.get('/bookings', getHostBookings);

export default router;
