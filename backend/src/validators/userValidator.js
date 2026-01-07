// backend/src/validators/userValidator.js
const { body } = require('express-validator');

exports.userUpdateValidation = [
    body('FullName').notEmpty().withMessage('กรุณากรอกชื่อ-นามสกุล'),
    
    body('Email').optional({ checkFalsy: true }).isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
    
    body('RoleID').isInt({ min: 1 }).withMessage('กรุณาเลือก Role'),
];

exports.passwordResetValidation = [
    body('password').isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
];