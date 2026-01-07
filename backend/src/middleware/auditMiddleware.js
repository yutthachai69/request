// backend/src/middleware/auditMiddleware.js
const AuditLog = require('../models/auditLogModel');

const auditMiddleware = (req, res, next) => {
    // บันทึก Log เฉพาะ Request ที่มีผู้ใช้ Login อยู่แล้ว
    // และไม่ใช่ Request ที่เกี่ยวกับ Auth (Login/Register)
    if (req.user && !req.originalUrl.includes('/auth')) {
        const userId = req.user.UserID;
        const ipAddress = req.ip;
        const action = `API_CALL: ${req.method} ${req.originalUrl}`;
        const detail = JSON.stringify(req.body);

        AuditLog.create({
            userId,
            action,
            detail,
            ipAddress
        }).catch(err => {
            console.error('Failed to log audit trail:', err);
        });
    }
    next();
};

module.exports = { auditMiddleware };