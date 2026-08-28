import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Workspace title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    category: {
      type: String,
      enum: ['Boardroom', 'Private Office', 'Event Space'],
      required: true,
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: 0,
    },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
    },
    amenities: [
      {
        type: String,
      },
    ],
    images: [
      {
        type: String, // Cloudinary URLs
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Listing', listingSchema);