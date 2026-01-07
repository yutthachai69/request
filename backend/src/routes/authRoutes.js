// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, changePassword, getUserStats } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRegisterUser, validateChangePassword } = require('../middleware/validators');

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	max: 50, 
	message: 'Too many login attempts from this IP, please try again after 15 minutes',
	standardHeaders: true, 
	legacyHeaders: false, 
    keyGenerator: (req, res) => {
        return req.ip || req.headers['x-forwarded-for']?.split(',').shift() || req.socket.remoteAddress;
    }
});

router.post('/register', validateRegisterUser, registerUser);
router.post('/login', loginLimiter, loginUser);
router.put('/change-password', protect, validateChangePassword, changePassword);

router.get('/my-stats', protect, getUserStats);

router.get('/profile', protect, (req, res) => {
  res.json(req.user);
});

router.get('/admin-check', protect, authorize('Admin'), (req, res) => {
  res.json({ message: `Welcome Admin ${req.user.FullName}!` });
});

module.exports = router;