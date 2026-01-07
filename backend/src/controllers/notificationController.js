// backend/src/controllers/notificationController.js
const Notification = require('../models/notificationModel');
const asyncHandler = require('../utils/asyncHandler');

exports.getNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.getForUser(req.user.UserID);
    res.json(notifications);
});

exports.markNotificationAsRead = asyncHandler(async (req, res) => {
    await Notification.markAsRead(req.params.id, req.user.UserID);
    res.status(200).json({ message: 'Notification marked as read' });
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.markAllAsReadForUser(req.user.UserID);
    res.status(200).json({ message: 'All notifications marked as read' });
});