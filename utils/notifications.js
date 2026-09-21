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