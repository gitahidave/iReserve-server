import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    bookingStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    paystackReference: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined values while ensuring uniqueness when present
    },
  },
  { timestamps: true }
);

// Compound index to accelerate slot-availability collision checks
bookingSchema.index({ listingId: 1, startTime: 1, endTime: 1 });

export default mongoose.model('Booking', bookingSchema);