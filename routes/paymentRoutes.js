import express from 'express';
import {
  handleDarajaCallback,
  initializeMpesaPayment,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/mpesa/initialize', protect, initializeMpesaPayment);
router.post('/callback', handleDarajaCallback);
 
export default router;