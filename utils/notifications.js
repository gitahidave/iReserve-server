import Notification from '../models/Notification.js';

export const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  bookingId,
  listingId,
}) => {
  if (!recipientId) return null;

  return Notification.create({
    recipientId,
    type,
    title,
    message,
    bookingId,
    listingId,
  });
};

export const createPaymentReceivedNotification = async ({
  recipientId,
  title,
  message,
  bookingId,
  listingId,
}) => {
  if (!recipientId) return null;

  return Notification.findOneAndUpdate(
    { recipientId, type: 'payment_received', bookingId },
    {
      $setOnInsert: {
        recipientId,
        type: 'payment_received',
        title,
        message,
        bookingId,
        listingId,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
};