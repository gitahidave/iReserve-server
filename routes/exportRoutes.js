import express from 'express';
import { downloadBookingPDF, downloadBookingsCSV } from '../controllers/exportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/pdf/:bookingId', protect, downloadBookingPDF);
router.get('/csv', protect, downloadBookingsCSV);

export default router;