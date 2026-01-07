// backend/src/controllers/authController.js
const User = require('../models/userModel');
const Permission = require('../models/permissionModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../utils/errors'); 
const AuditLog = require('../models/auditLogModel');

exports.registerUser = asyncHandler(async (req, res) => {
    const { username, password, fullName, email, departmentId, position, phoneNumber, roleId, categoryPermissions } = req.body;
    
    const userExists = await User.findByUsername(username);
    if (userExists) {
        throw new BadRequestError('ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว');
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = await User.create({ 
        username, 
        hashedPassword, 
        fullName, 
        email,
        departmentId, 
        position, 
        phoneNumber, 
        roleId
    });

    const newUserId = newUser.UserID;

    if (categoryPermissions && categoryPermissions.length > 0) {
        await Permission.updateForUser(newUserId, categoryPermissions);
    }
    
    await AuditLog.create({
        userId: newUserId,
        action: 'USER_REGISTERED',
        detail: `ผู้ใช้ใหม่ถูกสร้าง: ${username}`,
        ipAddress: req.ip
    });

    res.status(201).json({ message: 'ลงทะเบียนผู้ใช้สำเร็จ' });
});

exports.loginUser = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    const user = await User.findByUsername(username);
    if (!user || !user.IsActive) {
        await AuditLog.create({
            userId: null,
            action: 'LOGIN_FAILED',
            detail: `พยายามเข้าสู่ระบบด้วยชื่อผู้ใช้: ${username}`,
            ipAddress: req.ip
        });
        throw new UnauthorizedError('ข้อมูลเข้าระบบไม่ถูกต้อง หรือผู้ใช้ไม่ได้เปิดใช้งาน');
    }
    
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
        await AuditLog.create({
            userId: user.UserID,
            action: 'LOGIN_FAILED',
            detail: `รหัสผ่านไม่ถูกต้องสำหรับผู้ใช้: ${username}`,
            ipAddress: req.ip
        });
        throw new UnauthorizedError('ข้อมูลเข้าระบบไม่ถูกต้อง');
    }
    
    const payload = {
        user: {
            id: user.UserID,
            roleId: user.RoleID,
            roleName: user.RoleName
        },
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    await AuditLog.create({
        userId: user.UserID,
        action: 'USER_LOGIN',
        detail: `เข้าสู่ระบบสำเร็จ`,
        ipAddress: req.ip
    });

    res.json({
        token,
        user: {
            id: user.UserID,
            fullName: user.FullName,
            roleId: user.RoleID,
            roleName: user.RoleName,
            AllowBulkActions: user.AllowBulkActions 
        }
    });
});

exports.changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.UserID;

    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('ไม่พบข้อมูลผู้ใช้');
    }
    
    const isMatch = await bcrypt.compare(oldPassword, user.Password);
    if (!isMatch) {
        throw new UnauthorizedError('รหัสผ่านเดิมไม่ถูกต้อง');
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    await User.updatePassword(userId, hashedNewPassword);

    await AuditLog.create({
        userId: userId,
        action: 'PASSWORD_CHANGED',
        detail: `เปลี่ยนรหัสผ่านสำเร็จ`,
        ipAddress: req.ip
    });
    
    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
});

exports.getUserStats = asyncHandler(async (req, res) => {
    const userId = req.user.UserID;
    const stats = await User.getUserStats(userId);
    res.json(stats);
});