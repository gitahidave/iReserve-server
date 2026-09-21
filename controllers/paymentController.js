import crypto from 'crypto';
import axios from 'axios';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { createNotification } from '../utils/notifications.js';
import { getBookingConfirmationTemplate, getHostPaymentTemplate } from '../utils/emailTemplates.js';
import { sendEmail } from '../utils/sendEmail.js';

// @desc    Initialize Paystack Payment Checkout
// @route   POST /api/payments/initialize
// @access  Private
export const initializePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId).populate('listingId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only pay for your own bookings' });
    }

    if (booking.bookingStatus !== 'pending') {
      return res.status(409).json({ message: `This booking is already ${booking.bookingStatus}` });
    }

    if (!Number.isFinite(booking.totalPrice) || booking.totalPrice <= 0) {
      return res.status(400).json({ message: 'Booking amount must be greater than zero' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists' });
    }

    if (!booking.listingId) {
      return res.status(409).json({ message: 'The workspace listing is no longer available' });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ message: 'Payment service is not configured' });
    }

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
      .update(req.rawBody || JSON.stringify(req.body))
      .digest('hex');

    const signature = req.headers['x-paystack-signature'];
    const hashesMatch = signature && signature.length === hash.length
      ? crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
      : false;

    if (!hashesMatch) {
      return res.status(401).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body;

    // Process successful payment event
    if (event.event === 'charge.success') {
      const bookingId = event.data?.metadata?.bookingId;
      if (!bookingId) {
        return res.status(400).json({ message: 'Payment event is missing booking metadata' });
      }

      const booking = await Booking.findById(bookingId)
        .populate('clientId', 'name email')
        .populate({
          path: 'listingId',
          select: 'title location hostId',
          populate: { path: 'hostId', select: 'name email' },
        });
      if (booking) {
        const expectedAmount = Math.round(booking.totalPrice * 100);
        const eventAmount = Number(event.data?.amount);
        const referenceMatches = !booking.paystackReference
          || booking.paystackReference === event.data?.reference;

        if (
          !referenceMatches
          || eventAmount !== expectedAmount
          || event.data?.currency !== 'KES'
        ) {
          return res.status(400).json({ message: 'Payment event does not match the booking' });
        }

        const wasConfirmed = booking.bookingStatus === 'confirmed';
        booking.bookingStatus = 'confirmed';
        await booking.save();

        if (!wasConfirmed) {
          await Promise.all([
            createNotification({
              recipientId: booking.clientId._id,
              type: 'booking_confirmed',
              title: 'Booking confirmed',
              message: `Your booking for ${booking.listingId.title} has been confirmed.`,
              bookingId: booking._id,
              listingId: booking.listingId._id,
            }),
            createNotification({
              recipientId: booking.listingId.hostId._id,
              type: 'payment_received',
              title: 'Payment received',
              message: `Payment was received for ${booking.listingId.title}.`,
              bookingId: booking._id,
              listingId: booking.listingId._id,
            }),
          ]);
        }

        if (!booking.paymentEmailSentAt) {
          const emailResults = await Promise.allSettled([
            sendEmail({
              email: booking.clientId.email,
              subject: `Booking confirmed: ${booking.listingId.title}`,
              text: `Hi ${booking.clientId.name},\n\nYour payment was received and your booking for ${booking.listingId.title} is confirmed.\n\nBooking time: ${booking.startTime.toISOString()} to ${booking.endTime.toISOString()}\nAmount: ${booking.totalPrice} KES\n\nThank you for using iReserve.`,
              html: getBookingConfirmationTemplate(booking, booking.clientId),
            }),
            sendEmail({
              email: booking.listingId.hostId.email,
              subject: `Payment received: ${booking.listingId.title}`,
              text: `Hi ${booking.listingId.hostId.name},\n\nPayment was received for the booking on your listing, ${booking.listingId.title}.\n\nBooking time: ${booking.startTime.toISOString()} to ${booking.endTime.toISOString()}\nAmount: ${booking.totalPrice} KES\nClient: ${booking.clientId.name} (${booking.clientId.email})`,
              html: getHostPaymentTemplate(booking, booking.listingId.hostId),
            }),
          ]);

          const failedEmails = emailResults.filter((result) => result.status === 'rejected');
          failedEmails.forEach((result) => {
            console.error('Payment email dispatch failed:', result.reason?.message || result.reason);
          });

          if (failedEmails.length === 0) {
            booking.paymentEmailSentAt = new Date();
            await booking.save();
          }
        }
      }
    }

    // Always acknowledge receipt to Paystack with 200 OK
    res.status(200).send('Webhook Received');
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};