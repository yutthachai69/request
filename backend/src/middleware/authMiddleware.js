// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // findById will now include AllowBulkActions
      req.user = await User.findById(decoded.user.id);
      
      if (!req.user) {
        return res.status(401).json({ message: 'ไม่ได้รับอนุญาต, ไม่พบข้อมูลผู้ใช้' });
      }

      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      res.status(401).json({ message: 'ไม่ได้รับอนุญาต, token ไม่ถูกต้อง' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'ไม่ได้รับอนุญาต, ไม่มี token' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.RoleName)) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้' });
    }
    next();
  };
};

// ===== START: เพิ่ม Middleware ใหม่ =====
const allowBulk = (req, res, next) => {
    if (req.user && req.user.AllowBulkActions) {
        next();
    } else {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ใช้ฟังก์ชัน Bulk Actions' });
    }
};
// ===== END: เพิ่ม Middleware ใหม่ =====


// ===== START: แก้ไขการ export =====
module.exports = { protect, authorize, allowBulk };
// ===== END: แก้ไขการ export =====