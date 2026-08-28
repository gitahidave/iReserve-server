import Booking from '../models/Booking.js';
import { generateBookingPDF, generateCSVReport } from '../utils/exportHelpers.js';

// @desc    Download PDF Receipt for a Booking
// @route   GET /api/exports/pdf/:bookingId
// @access  Private
export const downloadBookingPDF = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('listingId')
      .populate('clientId', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify ownership (Client who booked or Admin/Host)
    if (
      booking.clientId._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to download this receipt' });
    }

    generateBookingPDF(booking, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export User/Host Bookings to CSV
// @route   GET /api/exports/csv
// @access  Private
export const downloadBookingsCSV = async (req, res) => {
  try {
    let filter = {};

    // Filter based on user role
    if (req.user.role === 'client') {
      filter.clientId = req.user.id;
    }

    const bookings = await Booking.find(filter)
      .populate('listingId', 'title category')
      .populate('clientId', 'name email')
      .sort({ createdAt: -1 });

    const csvData = generateCSVReport(bookings);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ireserve-report.csv');
    res.status(200).send(csvData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};