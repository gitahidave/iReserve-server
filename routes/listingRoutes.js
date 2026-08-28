import express from 'express';
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
} from '../controllers/listingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(getListings)
  .post(protect, authorize('host', 'admin'), createListing);

router
  .route('/:id')
  .get(getListingById)
  .put(protect, authorize('host', 'admin'), updateListing)
  .delete(protect, authorize('host', 'admin'), deleteListing);

export default router;