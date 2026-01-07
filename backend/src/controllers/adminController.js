// backend/src/controllers/adminController.js
const User = require('../models/userModel');
const MasterData = require('../models/masterDataModel');
const Permission = require('../models/permissionModel');
const Admin = require('../models/adminModel');
const asyncHandler = require('../utils/asyncHandler');
const EmailModel = require('../models/emailModel');
const cache = require('../utils/cache'); 
const AuditLog = require('../models/auditLogModel');
const bcrypt = require('bcryptjs');
const { BadRequestError } = require('../utils/errors');

exports.getActions = asyncHandler(async (req, res) => {
    if (cache.has('actions')) {
        return res.json(cache.get('actions'));
    }
    const actions = await Admin.getActions();
    cache.set('actions', actions);
    res.json(actions);
});

exports.getRoles = asyncHandler(async (req, res) => {
    const roles = await Admin.getRoles();
    res.json(roles);
});

exports.createRole = asyncHandler(async (req, res) => {
    const roleData = {
        RoleName: req.body.RoleName,
        Description: req.body.Description,
        AllowBulkActions: req.body.AllowBulkActions || false
    };
    await Admin.createRole(roleData);
    cache.del('roles'); 
    res.status(201).json({ message: 'สร้าง Role สำเร็จ' });
});

exports.updateRole = asyncHandler(async (req, res) => {
    const roleData = {
        RoleName: req.body.RoleName,
        Description: req.body.Description,
        AllowBulkActions: req.body.AllowBulkActions || false
    };
    await Admin.updateRole(req.params.id, roleData);
    cache.del('roles'); 
    res.json({ message: 'อัปเดต Role สำเร็จ' });
});

exports.deleteRole = asyncHandler(async (req, res) => {
    await Admin.deleteRole(req.params.id);
    cache.del('roles');
    res.json({ message: 'ลบ Role สำเร็จ' });
});

// --- User Management ---
exports.getAllUsers = asyncHandler(async (req, res) => {
    const { search, page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 5;

    const { users, totalCount } = await User.getAll({
        searchTerm: search,
        page: pageNumber,
        limit: limitNumber
    });
    
    res.json({
        users,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
        totalCount
    });
});


exports.getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error('ไม่พบข้อมูลผู้ใช้');
    }
    res.json(user);
});

exports.updateUser = asyncHandler(async (req, res) => {
    const { 
        FullName, Email, DepartmentID, Position, RoleID, IsActive, 
        categoryPermissions, specialApproverMappings, specialRoleIds
    } = req.body;
    const userId = req.params.id;

    const userData = { FullName, Email, DepartmentID, Position, RoleID, IsActive };
    await User.update(userId, userData);
    
    if (typeof categoryPermissions !== 'undefined') {
        await Permission.updateForUser(userId, categoryPermissions);
    }

    if (typeof specialApproverMappings !== 'undefined') {
        await Admin.updateApproverMappingsForUser(userId, specialApproverMappings);
    }

    if (typeof specialRoleIds !== 'undefined') {
        await Admin.updateSpecialRolesForUser(userId, specialRoleIds);
    }

    res.json({ message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ' });
});

exports.deleteUser = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const actor = req.user;

    if (parseInt(userId, 10) === actor.UserID) {
        throw new BadRequestError('ไม่สามารถลบบัญชีผู้ใช้ของตนเองได้');
    }
    
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
        res.status(404);
        throw new Error('ไม่พบข้อมูลผู้ใช้ที่ต้องการลบ');
    }
    
    await User.deleteById(userId);

    await AuditLog.create({
        userId: actor.UserID,
        action: 'USER_DELETED',
        detail: `ผู้ใช้ ${actor.FullName} ลบบัญชีผู้ใช้ ID: ${userId} (Username: ${userToDelete.Username})`,
        ipAddress: req.ip
    });

    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
});

exports.getUserPermissions = asyncHandler(async (req, res) => {
    const permissions = await Permission.getForUser(req.params.id);
    res.json(permissions);
});

exports.resetUserPassword = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const { id: userId } = req.params;

    if (!password || password.length < 6) {
        throw new BadRequestError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.updatePassword(userId, hashedPassword);

    await AuditLog.create({
        userId: req.user.UserID,
        action: 'ADMIN_RESET_PASSWORD',
        detail: `รีเซ็ตรหัสผ่านสำหรับ UserID: ${userId} โดย ${req.user.FullName}`,
        ipAddress: req.ip
    });

    res.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
});


// --- Document Config ---
exports.getDocNumberConfigs = asyncHandler(async (req, res) => {
    const configs = await MasterData.getDocConfigs();
    res.json(configs);
});

exports.saveDocNumberConfig = asyncHandler(async (req, res) => {
    await MasterData.upsertDocConfig(req.body);
    res.status(200).json({ message: 'บันทึกการตั้งค่าสำเร็จ' });
});

// --- Correction Type Controllers ---
exports.getCorrectionTypesAdmin = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10; // Default to 10 items per page

    const { types, totalCount } = await Admin.getCorrectionTypesAdmin({
        page: pageNumber,
        limit: limitNumber
    });

    res.json({
        types,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
        totalCount
    });
});

exports.createCorrectionType = asyncHandler(async (req, res) => {
    await Admin.createCorrectionType(req.body);
    cache.del('correction_types_all'); 
    res.status(201).json({ message: 'สร้างประเภทการแก้ไขสำเร็จ' });
});

exports.updateCorrectionType = asyncHandler(async (req, res) => {
    await Admin.updateCorrectionType(req.params.id, req.body);
    cache.del('correction_types_all'); 
    res.json({ message: 'อัปเดตประเภทการแก้ไขสำเร็จ' });
});

exports.deleteCorrectionType = asyncHandler(async (req, res) => {
    await Admin.deleteCorrectionType(req.params.id);
    cache.del('correction_types_all');
    res.json({ message: 'ลบประเภทการแก้ไขสำเร็จ' });
});

exports.getCategoryMappingsForCorrectionType = asyncHandler(async (req, res) => {
    const mappings = await Admin.getCategoryMappingsForCorrectionType(req.params.id);
    res.json(mappings);
});

// --- Correction Reason Controllers ---
exports.getCorrectionReasonsAdmin = asyncHandler(async (req, res) => {
    const reasons = await Admin.getCorrectionReasons();
    res.json(reasons);
});

exports.createCorrectionReason = asyncHandler(async (req, res) => {
    await Admin.createCorrectionReason(req.body.reasonText);
    cache.del('correction_reasons'); 
    res.status(201).json({ message: 'สร้างเหตุผลการแก้ไขสำเร็จ' });
});

exports.updateCorrectionReason = asyncHandler(async (req, res) => {
    const { reasonText, isActive } = req.body;
    await Admin.updateCorrectionReason(req.params.id, reasonText, isActive);
    cache.del('correction_reasons'); 
    res.json({ message: 'อัปเดตเหตุผลการแก้ไขสำเร็จ' });
});

// --- Approver Mapping Controllers ---
exports.getApproverMappingsForUser = asyncHandler(async (req, res) => {
    const mappings = await Admin.getApproverMappingsForUser(req.params.id);
    res.json(mappings);
});

// --- Special Roles Controllers ---
exports.getSpecialRoles = asyncHandler(async (req, res) => {
    const roles = await Admin.getSpecialRoles();
    res.json(roles);
});

exports.getSpecialRolesForUser = asyncHandler(async (req, res) => {
    const roles = await Admin.getSpecialRolesForUser(req.params.id);
    res.json(roles);
});

// --- Workflow Controllers ---
exports.getWorkflow = asyncHandler(async (req, res) => {
    const { categoryId, correctionTypeId } = req.query;
    if (!categoryId) {
        return res.status(400).json({ message: 'กรุณาระบุ Category ID' });
    }
    const workflow = await Admin.getWorkflow(categoryId, correctionTypeId || null);
    res.json(workflow);
});

exports.updateWorkflow = asyncHandler(async (req, res) => {
    const { categoryId, correctionTypeId, transitions } = req.body;
    if (!categoryId || typeof transitions === 'undefined') {
        return res.status(400).json({ message: 'กรุณาระบุ Category ID และ transitions' });
    }
    await Admin.updateWorkflow(categoryId, correctionTypeId || null, transitions);
    res.json({ message: 'อัปเดต Workflow สำเร็จ' });
});

exports.getAllWorkflows = asyncHandler(async (req, res) => {
    const workflows = await Admin.getAllWorkflows();
    res.json(workflows);
});

exports.copyWorkflow = asyncHandler(async (req, res) => {
    await Admin.copyWorkflow(req.body);
    res.json({ message: 'คัดลอก Workflow สำเร็จ' });
});

exports.deleteWorkflow = asyncHandler(async (req, res) => {
    const { categoryId, correctionTypeId } = req.body;
    await Admin.deleteWorkflow(categoryId, correctionTypeId || null);
    res.json({ message: 'ลบ Workflow สำเร็จ' });
});

// --- Email Template Controllers ---
exports.getEmailTemplates = asyncHandler(async (req, res) => {
    const templates = await EmailModel.getAllTemplates();
    res.json(templates);
});

exports.updateEmailTemplate = asyncHandler(async (req, res) => {
    const { subject, body } = req.body;
    await EmailModel.updateTemplate(req.params.id, { subject, body });
    res.json({ message: 'อัปเดต Email Template สำเร็จ' });
});

// --- Special Approver Mappings ---
exports.getSpecialApproverMappings = asyncHandler(async (req, res) => {
    const { categoryId, correctionTypeId } = req.query;
    if (!categoryId) {
        return res.status(400).json({ message: 'Category ID is required' });
    }
    const mappings = await Admin.getSpecialApproverMappings(categoryId, correctionTypeId || null);
    res.json(mappings);
});

exports.updateSpecialApproverMappings = asyncHandler(async (req, res) => {
    const { categoryId, correctionTypeId, mappings } = req.body;
    if (!categoryId) {
        return res.status(400).json({ message: 'Category ID is required' });
    }
    await Admin.updateSpecialApproverMappings(categoryId, correctionTypeId || null, mappings);
    res.json({ message: 'บันทึกผู้อนุมัติรายบุคคลสำเร็จ' });
});

exports.getAuditLogs = asyncHandler(async (req, res) => {
    const { page, limit, search, userId, action, startDate, endDate } = req.query;
    const logs = await AuditLog.getLogs({
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
        search,
        userId: userId || null,
        action: action || null,
        startDate: startDate || null,
        endDate: endDate || null,
    });
    res.json(logs);
});

exports.getAuditLogActions = asyncHandler(async (req, res) => {
    const actions = await AuditLog.getDistinctActions();
    res.json(actions);
});