import Notification from '../models/Notification.js';

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user.id })
      .populate('bookingId', 'listingId startTime endTime bookingStatus totalPrice')
      .populate('listingId', 'title location')
      .sort({ createdAt: -1 });

    const unreadCount = notifications.reduce(
      (count, notification) => count + (notification.readAt ? 0 : 1),
      0
    );

    res.status(200).json({ success: true, unreadCount, notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, readAt: null },
      { readAt: new Date() }
    );

    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};