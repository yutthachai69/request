// backend/src/middleware/timeoutHandler.js
// ✅ Request Timeout Handler - ป้องกัน request ที่ค้างนานเกินไป

const requestTimeout = (timeoutMs = 30000) => { // Default: 30 seconds
    return (req, res, next) => {
        // ตั้ง timeout สำหรับ request
        req.setTimeout(timeoutMs, () => {
            if (!res.headersSent) {
                res.status(408).json({
                    message: 'Request timeout. The request took too long to process.',
                    timeout: timeoutMs / 1000
                });
            }
        });
        
        next();
    };
};

module.exports = requestTimeout;


