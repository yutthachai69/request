// backend/src/middleware/errorHandler.js
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
    // ใช้ logger บันทึก error ทั้งหมด
    logger.error(err.message, { stack: err.stack });

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
            stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
        });
    }

    // สำหรับ Error ที่ไม่คาดคิด
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode).json({
        message: 'An unexpected error occurred on the server.',
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
};

module.exports = errorHandler;