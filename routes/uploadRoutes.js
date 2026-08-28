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
  upload.array('images', 5), // 'images' field name, max 5 files
  (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Please upload at least one image file' });
      }

      // Extract secure Cloudinary HTTPS URLs returned by multer-storage-cloudinary
      const imageUrls = req.files.map((file) => file.path);

      res.status(200).json({
        success: true,
        message: 'Images uploaded successfully',
        images: imageUrls,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;