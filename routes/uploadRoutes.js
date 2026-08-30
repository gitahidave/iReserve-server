import express from 'express';
import { upload } from '../config/cloudinary.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Upload multiple listing images to Cloudinary
// @route   POST /api/upload
// @access  Private (Host, Admin)
router.post(
  '/',
  protect,
  authorize('host', 'admin'),
  (req, res, next) => {
    upload.array('images', 5)(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.message || 'Image upload failed',
        });
      }

      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ message: 'Please upload at least one image file' });
        }

        const imageUrls = req.files.map((file) => file.path || file.secure_url || file.url);

        res.status(200).json({
          success: true,
          message: 'Images uploaded successfully',
          images: imageUrls,
        });
      } catch (error) {
        res.status(500).json({ message: error.message || 'Internal Server Error' });
      }
    });
  }
);

export default router;