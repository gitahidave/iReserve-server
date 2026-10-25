import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Listing from '../models/Listing.js';
import { createNotification } from '../utils/notifications.js';

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

    await createNotification({
      recipientId: listing.hostId,
      type: 'booking_created',
      title: 'New booking request',
      message: `${req.user.name} requested ${listing.title} for ${start.toISOString()} to ${end.toISOString()}.`,
      bookingId: booking._id,
      listingId: listing._id,
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

// @desc    Cancel a pending booking
// @route   PATCH /api/bookings/:bookingId/cancel
// @access  Private (Client)
export const cancelBooking = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.bookingId)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.bookingId,
        clientId: req.user.id,
        bookingStatus: 'pending',
        paymentStatus: { $ne: 'paid' },
      },
      { $set: { bookingStatus: 'cancelled' } },
      { new: true, runValidators: true }
    );

    if (booking) {
      return res.status(200).json({ success: true, booking });
    }

    const existingBooking = await Booking.findOne({
      _id: req.params.bookingId,
      clientId: req.user.id,
    });
    if (!existingBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    return res.status(409).json({
      message: `This booking cannot be cancelled because it is ${existingBooking.bookingStatus}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings for listings owned by the logged-in host
// @route   GET /api/hosts/bookings
// @access  Private (Host or Admin)
export const getHostBookings = async (req, res) => {
  try {
    const listingQuery = req.user.role === 'admin' ? {} : { hostId: req.user.id };
    const listingIds = await Listing.find(listingQuery).distinct('_id');
    const bookings = await Booking.find({ listingId: { $in: listingIds } })
      .populate('listingId', 'title category location hourlyRate hostId')
      .populate('clientId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};