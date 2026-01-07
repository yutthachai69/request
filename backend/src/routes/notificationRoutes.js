// backend/src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { getNotifications, markNotificationAsRead, markAllAsRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// ใช้ middleware `protect` กับทุก route ในไฟล์นี้
router.use(protect);

// GET /api/notifications
router.get('/', getNotifications);

// PUT /api/notifications/mark-all-read
// บรรทัดนี้คือจุดที่แก้ไขให้รองรับเมธอด PUT ซึ่งจะแก้ข้อผิดพลาด 405
router.put('/mark-all-read', markAllAsRead);

// PUT /api/notifications/:id/read
router.put('/:id/read', markNotificationAsRead);

module.exports = router;