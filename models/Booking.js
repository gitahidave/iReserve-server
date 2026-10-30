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
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default() {
        return this.bookingStatus === 'confirmed' ? 'paid' : 'pending';
      },
    },
    mpesaPaymentAttempts: [{
      merchantRequestId: String,
      checkoutRequestId: String,
      phoneNumber: String,
      amount: Number,
      status: {
        type: String,
        enum: ['initiating', 'pending', 'failed', 'paid'],
        required: true,
      },
      receiptNumber: String,
      resultCode: Number,
      resultDescription: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    paymentEmailSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to accelerate slot-availability collision checks
bookingSchema.index({ listingId: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ 'mpesaPaymentAttempts.checkoutRequestId': 1 });

export default mongoose.model('Booking', bookingSchema);