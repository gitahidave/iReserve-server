import crypto from 'crypto';
import axios from 'axios';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

// @desc    Initialize Paystack Payment Checkout
// @route   POST /api/payments/initialize
// @access  Private
export const initializePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId).populate('listingId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const user = await User.findById(req.user.id);
    const host = booking.listingId?.hostId
      ? await User.findById(booking.listingId.hostId)
      : null;

    // Convert price to smallest currency unit (Kobo / Cents) for Paystack
    const amountInSubunits = Math.round(booking.totalPrice * 100);

    const paystackPayload = {
      email: user.email,
      amount: amountInSubunits,
      currency: 'KES',
      metadata: {
        bookingId: booking._id.toString(),
        clientId: user._id.toString(),
        hostId: booking.listingId?.hostId?.toString?.() || '',
      },
      callback_url: `${process.env.CLIENT_URL}/dashboard/client`,
    };

    if (host?.paystackSubaccountCode) {
      paystackPayload.subaccount = host.paystackSubaccountCode;
      paystackPayload.bearer = 'subaccount';
    }

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      paystackPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Save transaction reference
    booking.paystackReference = response.data.data.reference;
    await booking.save();

    res.status(200).json({
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference,
    });
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
};

// @desc    Paystack Webhook Listener (Verifies HMAC SHA512 Signature)
// @route   POST /api/payments/webhook
// @access  Public (Validated via Paystack Secret Key)
export const handlePaystackWebhook = async (req, res) => {
  try {
    // Validate HMAC SHA512 Signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body;

    // Process successful payment event
    if (event.event === 'charge.success') {
      const { bookingId } = event.data.metadata;

      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.bookingStatus = 'confirmed';
        await booking.save();
      }
    }

    // Always acknowledge receipt to Paystack with 200 OK
    res.status(200).send('Webhook Received');
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};