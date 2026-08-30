import express from 'express';
import {
  setupHostPayouts,
  getSupportedBanks,
  onboardHost,
} from '../controllers/hostController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('host', 'admin'));

router.post('/setup-payouts', setupHostPayouts);
router.post('/onboard', onboardHost);
router.get('/banks', getSupportedBanks);

export default router;
