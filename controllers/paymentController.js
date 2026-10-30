import axios from 'axios';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import {
  createNotification,
  createPaymentReceivedNotification,
} from '../utils/notifications.js';
import { getBookingConfirmationTemplate, getHostPaymentTemplate } from '../utils/emailTemplates.js';
import { sendEmail } from '../utils/sendEmail.js';

const getDarajaBaseUrl = () => {
  if (!process.env.MPESA_BASE_URL) {
    return null;
  }

  try {
    const url = new URL(process.env.MPESA_BASE_URL);
    if (
      url.protocol !== 'https:'
      || url.pathname !== '/'
      || url.search
      || url.hash
      || url.username
      || url.password
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
};

const getDarajaTimestamp = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}${value('month')}${value('day')}${value('hour')}${value('minute')}${value('second')}`;
};

const normalizeKenyanPhoneNumber = (phoneNumber) => {
  const normalized = String(phoneNumber || '').replace(/[\s()-]/g, '');
  if (/^0[17]\d{8}$/.test(normalized)) {
    return `254${normalized.slice(1)}`;
  }
  if (/^\+?254[17]\d{8}$/.test(normalized)) {
    return normalized.replace(/^\+/, '');
  }
  return null;
};

const getDarajaAccessToken = async () => {
  const response = await axios.get(
    `${getDarajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      auth: {
        username: process.env.MPESA_CONSUMER_KEY,
        password: process.env.MPESA_CONSUMER_SECRET,
      },
    }
  );
  return response.data.access_token;
};

const completeBookingPayment = async (booking) => {
  const wasConfirmed = booking.bookingStatus === 'confirmed';
  const wasPaid = booking.paymentStatus === 'paid';
  booking.bookingStatus = 'confirmed';
  booking.paymentStatus = 'paid';
  await booking.save();

  if (!wasPaid) {
    await createPaymentReceivedNotification({
      recipientId: booking.listingId.hostId?._id,
      title: 'Payment received',
      message: `Payment was received for ${booking.listingId.title}.`,
      bookingId: booking._id,
      listingId: booking.listingId._id,
    });
  }

  if (!wasConfirmed) {
    await createNotification({
      recipientId: booking.clientId._id,
      type: 'booking_confirmed',
      title: 'Booking confirmed',
      message: `Your booking for ${booking.listingId.title} has been confirmed.`,
      bookingId: booking._id,
      listingId: booking.listingId._id,
    });
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
};

// @desc    Initialize an M-Pesa STK Push
// @route   POST /api/payments/mpesa/initialize
// @access  Private
export const initializeMpesaPayment = async (req, res) => {
  try {
    const { bookingId, phoneNumber } = req.body;
    if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ message: 'A valid booking ID is required' });
    }

    const normalizedPhone = normalizeKenyanPhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        message: 'Enter a valid Kenyan mobile number, such as 0712345678 or 254712345678',
      });
    }

    const {
      MPESA_CONSUMER_KEY: consumerKey,
      MPESA_CONSUMER_SECRET: consumerSecret,
      MPESA_SHORT_CODE: shortcode,
      MPESA_PASSKEY: passkey,
      MPESA_CALLBACK_URL: callbackUrl,
    } = process.env;
    const baseUrl = getDarajaBaseUrl();
    if (
      !consumerKey
      || !consumerSecret
      || !shortcode
      || !passkey
      || !callbackUrl
      || !baseUrl
    ) {
      return res.status(503).json({ message: 'M-Pesa payment service is not configured' });
    }

    let callback;
    try {
      callback = new URL(callbackUrl);
      if (
        callback.protocol !== 'https:'
      ) {
        throw new Error('Unsupported callback URL');
      }
    } catch {
      return res.status(503).json({ message: 'M-Pesa callback URL is invalid' });
    }

    const booking = await Booking.findById(bookingId).populate('listingId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only pay for your own bookings' });
    }
    if (booking.bookingStatus !== 'pending' || booking.paymentStatus !== 'pending') {
      return res.status(409).json({ message: 'This booking is not awaiting payment' });
    }
    if (!booking.listingId) {
      return res.status(409).json({ message: 'The workspace listing is no longer available' });
    }
    if (!Number.isFinite(booking.totalPrice) || booking.totalPrice <= 0) {
      return res.status(400).json({ message: 'Booking amount must be greater than zero' });
    }

    const amount = Math.round(booking.totalPrice);
    if (amount < 1) {
      return res.status(400).json({ message: 'Booking amount must be at least 1 KES for M-Pesa' });
    }

    const attemptId = new Booking()._id;
    const reservedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        bookingStatus: 'pending',
        paymentStatus: 'pending',
        mpesaPaymentAttempts: {
          $not: { $elemMatch: { status: { $in: ['initiating', 'pending'] } } },
        },
      },
      {
        $push: {
          mpesaPaymentAttempts: {
            _id: attemptId,
            phoneNumber: normalizedPhone,
            amount,
            status: 'initiating',
          },
        },
      },
      { new: true, runValidators: true }
    );
    if (!reservedBooking) {
      return res.status(409).json({ message: 'An M-Pesa payment request is already in progress' });
    }

    try {
      const accessToken = await getDarajaAccessToken();
      const timestamp = getDarajaTimestamp();
      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
      const response = await axios.post(
        `${baseUrl}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: normalizedPhone,
          PartyB: shortcode,
          PhoneNumber: normalizedPhone,
          CallBackURL: callback.toString(),
          AccountReference: 'iReserve',
          TransactionDesc: 'Workspace booking',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const { CheckoutRequestID, MerchantRequestID, ResponseCode, ResponseDescription } = response.data;
      if (Number(ResponseCode) !== 0 || !CheckoutRequestID || !MerchantRequestID) {
        throw new Error(ResponseDescription || 'Daraja did not accept the M-Pesa request');
      }

      const attempt = reservedBooking.mpesaPaymentAttempts.id(attemptId);
      attempt.checkoutRequestId = CheckoutRequestID;
      attempt.merchantRequestId = MerchantRequestID;
      attempt.status = 'pending';
      await reservedBooking.save();

      return res.status(200).json({
        message: response.data.CustomerMessage || 'M-Pesa payment prompt sent',
        checkoutRequestId: CheckoutRequestID,
        merchantRequestId: MerchantRequestID,
      });
    } catch (error) {
      const attempt = reservedBooking.mpesaPaymentAttempts.id(attemptId);
      attempt.status = 'failed';
      attempt.resultDescription = error.response?.data?.errorMessage
        || error.response?.data?.ResponseDescription
        || error.message;
      await reservedBooking.save();
      console.error('Daraja STK Push initialization failed:', error.response?.data || error.message);
      return res.status(502).json({ message: 'Unable to start M-Pesa payment' });
    }
  } catch (error) {
    console.error('M-Pesa payment initialization error:', error.message);
    return res.status(500).json({ message: 'Unable to initialize M-Pesa payment' });
  }
};

// @desc    Process Daraja STK Push callback
// @route   POST /api/payments/mpesa/callback
// @access  Public (matched against the stored CheckoutRequestID)
export const handleDarajaCallback = async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback;
    const checkoutRequestId = callback?.CheckoutRequestID;
    if (
      !checkoutRequestId
      || callback?.ResultCode === undefined
      || callback.ResultCode === null
      || String(callback.ResultCode).trim() === ''
      || !Number.isInteger(Number(callback.ResultCode))
    ) {
      return res.status(400).json({ message: 'Invalid M-Pesa callback payload' });
    }

    const booking = await Booking.findOne({
      'mpesaPaymentAttempts.checkoutRequestId': checkoutRequestId,
    })
      .populate('clientId', 'name email')
      .populate({
        path: 'listingId',
        select: 'title location hostId',
        populate: { path: 'hostId', select: 'name email' },
      });

    if (!booking) {
      console.warn('Received M-Pesa callback for an unknown CheckoutRequestID');
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const attempt = booking.mpesaPaymentAttempts.find(
      (paymentAttempt) => paymentAttempt.checkoutRequestId === checkoutRequestId
    );
    if (
      !attempt
      || (attempt.merchantRequestId && attempt.merchantRequestId !== callback.MerchantRequestID)
    ) {
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const resultCode = Number(callback.ResultCode);
    if (resultCode !== 0) {
      if (attempt.status !== 'paid') {
        attempt.status = 'failed';
        attempt.resultCode = resultCode;
        attempt.resultDescription = callback.ResultDesc || 'M-Pesa payment was not completed';
        await booking.save();
      }
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const metadata = callback.CallbackMetadata?.Item || [];
    const itemValue = (name) => metadata.find((item) => item.Name === name)?.Value;
    const receivedAmount = Number(itemValue('Amount'));
    const receiptNumber = itemValue('MpesaReceiptNumber');
    if (receivedAmount !== attempt.amount || !receiptNumber) {
      console.error('M-Pesa callback did not match the stored payment attempt', checkoutRequestId);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const timestamp = getDarajaTimestamp();
    const shortcode = process.env.MPESA_SHORT_CODE;
    const passkey = process.env.MPESA_PASSKEY;
    const baseUrl = getDarajaBaseUrl();
    if (!shortcode || !passkey || !baseUrl) {
      console.error('Daraja credentials are unavailable while verifying an M-Pesa callback');
      return res.status(503).json({ message: 'Unable to verify M-Pesa callback' });
    }
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    const queryResponse = await axios.post(
      `${baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      {
        headers: {
          Authorization: `Bearer ${await getDarajaAccessToken()}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (queryResponse.data?.ResultCode !== '0' && queryResponse.data?.ResultCode !== 0) {
      console.error('Daraja transaction query did not confirm the successful callback', checkoutRequestId);
      return res.status(503).json({ message: 'M-Pesa transaction is not yet verified' });
    }

    if (attempt.status !== 'paid') {
      attempt.status = 'paid';
      attempt.resultCode = resultCode;
      attempt.resultDescription = callback.ResultDesc;
      attempt.receiptNumber = String(receiptNumber);
      await booking.save();
    }
    await completeBookingPayment(booking);

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('Daraja callback processing failed:', error.message);
    return res.status(500).json({ message: 'Unable to process M-Pesa callback' });
  }
};
