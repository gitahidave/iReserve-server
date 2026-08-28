import Booking from '../models/Booking.js';
import Listing from '../models/Listing.js';

// @desc    Create new booking with Collision Lock validation
// @route   POST /api/bookings
// @access  Private (Client)
export const createBooking = async (req, res) => {
  try {
    const { listingId, startTime, endTime } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Retrieve venue listing for rate calculation
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Workspace listing not found' });
    }

    // Server-side Double-Booking Collision Check
    // A collision exists if an active/confirmed booking overlaps:
    // (ExistingStart < NewEnd) AND (ExistingEnd > NewStart)
    const existingCollision = await Booking.findOne({
      listingId,
      bookingStatus: { $in: ['confirmed', 'pending'] },
      $and: [
        { startTime: { $lt: end } },
        { endTime: { $gt: start } },
      ],
    });

    if (existingCollision) {
      return res.status(409).json({
        message: 'The selected workspace time slot is no longer available. Please choose another time.',
      });
    }

    // Calculate total hours and price
    const durationInHours = (end - start) / (1000 * 60 * 60);
    const totalPrice = parseFloat((durationInHours * listing.hourlyRate).toFixed(2));

    const booking = await Booking.create({
      listingId,
      clientId: req.user.id,
      startTime: start,
      endTime: end,
      totalPrice,
      bookingStatus: 'pending',
    });

    res.status(201).json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings for logged-in user
// @route   GET /api/bookings/my-bookings
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ clientId: req.user.id })
      .populate('listingId', 'title category location hourlyRate images')
      .sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};