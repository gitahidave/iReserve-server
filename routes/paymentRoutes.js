import express from 'express';
import { initializePayment, handlePaystackWebhook } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/initialize', protect, initializePayment);
router.post('/webhook', handlePaystackWebhook); // No protect middleware (uses HMAC verification)

export default router;