// backend/src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Global API Rate Limiter - ใช้กับทุก API endpoint
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 นาที
    // ✅ เพิ่ม limit สำหรับ development และ production
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Production: 100, Development: 1000
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes',
        retryAfter: 15
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // ✅ Skip rate limiting สำหรับ:
    // 1. Development mode (เพื่อความสะดวกในการพัฒนา)
    // 2. Admin users (เพราะ Admin ต้องใช้ API มาก) - ตรวจสอบจาก req.user (หลังจาก authenticate)
    // 3. Login route (เพราะมี rate limit แยกอยู่แล้ว)
    skip: (req) => {
        // ✅ Skip ใน development mode (เพื่อความสะดวกในการทดสอบ)
        if (process.env.NODE_ENV !== 'production') {
            return true;
        }
        // Skip ถ้าเป็น login route (มี rate limit แยกอยู่แล้ว)
        if (req.path === '/api/auth/login' || 
            req.path === '/auth/login' || 
            req.originalUrl.includes('/auth/login')) {
            return true;
        }
        // Skip ถ้าเป็น Admin (req.user จะมีหลังจาก protect middleware ทำงาน)
        // หมายเหตุ: rate limiter ทำงานก่อน protect middleware สำหรับบาง routes
        // แต่ถ้า route มี protect middleware แล้ว req.user จะมี
        if (req.user && req.user.RoleName === 'Admin') {
            return true;
        }
        return false;
    },
    // ✅ ใช้ IP address เป็น key (รองรับ proxy)
    keyGenerator: (req) => {
        return req.ip || 
               req.headers['x-forwarded-for']?.split(',').shift()?.trim() || 
               req.socket.remoteAddress || 
               'unknown';
    },
    // ✅ Handler เมื่อเกิน limit
    handler: (req, res) => {
        res.status(429).json({
            message: 'Too many requests from this IP, please try again after 15 minutes',
            retryAfter: 15
        });
    }
});

module.exports = apiLimiter;

