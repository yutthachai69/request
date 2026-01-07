// backend/src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardStatistics, getCategorySpecificStats, getReportData } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/statistics', protect, getDashboardStatistics);
router.get('/category-stats', protect, getCategorySpecificStats);

// Route สำหรับ Report Page (Admin & Head of Dept)
// ===== START: แก้ไขบรรทัดนี้ =====
router.get('/report-data', protect, authorize('Admin', 'Head of Department'), getReportData);
// ===== END: แก้ไขบรรทัดนี้ =====

module.exports = router;