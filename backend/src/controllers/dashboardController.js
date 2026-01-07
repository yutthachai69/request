// backend/src/controllers/dashboardController.js
const Request = require('../models/requestModel');
const asyncHandler = require('../utils/asyncHandler');

exports.getDashboardStatistics = asyncHandler(async (req, res) => {
    const [avgTime, categoryCounts, pendingCount] = await Promise.all([
        Request.getAverageApprovalTime(),
        Request.getRequestCountByCategory(),
        Request.getPendingRequestsCount()
    ]);

    res.json({
        averageApprovalTimeInHours: avgTime,
        requestCountByCategory: categoryCounts,
        pendingRequestCount: pendingCount,
    });
});

exports.getCategorySpecificStats = asyncHandler(async (req, res) => {
    const userId = req.user.UserID;
    const stats = await Request.getStatsByPermittedCategories(userId);
    res.json(stats);
});

exports.getReportData = asyncHandler(async (req, res) => {
    const { UserLevel, DepartmentID } = req.user;
    const { startDate, endDate } = req.query;

    // Admin (Level 0) gets all data (departmentId is null)
    // Other levels (e.g., Level 4) use their own DepartmentID
    const departmentId = UserLevel === 0 ? null : DepartmentID;

    const reportData = await Request.getAggregatedReportData({
        departmentId,
        startDate,
        endDate
    });

    res.json(reportData);
});