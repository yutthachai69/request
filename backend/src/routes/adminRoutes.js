// backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { 
    getAllUsers, 
    getUserById, 
    updateUser, 
    deleteUser,
    resetUserPassword,
    getDocNumberConfigs, 
    saveDocNumberConfig, 
    getUserPermissions,
    getCorrectionTypesAdmin,
    createCorrectionType,
    updateCorrectionType,
    deleteCorrectionType,
    getCategoryMappingsForCorrectionType,
    getCorrectionReasonsAdmin,
    createCorrectionReason,
    updateCorrectionReason,
    getApproverMappingsForUser,
    getWorkflow,
    updateWorkflow,
    getAllWorkflows,
    copyWorkflow,
    deleteWorkflow,
    getSpecialRoles,
    getSpecialRolesForUser,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    getActions,
    getEmailTemplates,
    updateEmailTemplate,
    getSpecialApproverMappings,
    updateSpecialApproverMappings,
    getAuditLogs,
    getAuditLogActions
} = require('../controllers/adminController');

const { getTabsForRole } = require('../controllers/roleController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { userUpdateValidation, passwordResetValidation } = require('../validators/userValidator');

// Middleware ที่ใช้กับทุก Route ในไฟล์นี้
router.use(protect);
router.get('/roles/mytabs', getTabsForRole);
router.use(authorize('Admin')); // Middleware นี้จะถูกใช้กับทุก Route ที่ประกาศหลังจากบรรทัดนี้

// Audit Logs
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/actions', getAuditLogActions);

// Actions
router.get('/actions', getActions);

// Roles Management
router.route('/roles')
    .get(getRoles)
    .post(createRole);
router.route('/roles/:id')
    .put(updateRole)
    .delete(deleteRole);

// --- User Management ---
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById); 
router.get('/users/:id/permissions', getUserPermissions);
router.get('/users/:id/approver-mappings', getApproverMappingsForUser);
router.get('/users/:id/special-roles', getSpecialRolesForUser);

router.put('/users/:id', userUpdateValidation, validate, updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', passwordResetValidation, validate, resetUserPassword);

// --- Document Config Management ---
router.route('/doc-configs')
    .get(getDocNumberConfigs)
    .post(saveDocNumberConfig);

// --- Correction Type Management ---
router.route('/correction-types')
    .get(getCorrectionTypesAdmin)
    .post(createCorrectionType);
router.route('/correction-types/:id/categories')
    .get(getCategoryMappingsForCorrectionType);
router.route('/correction-types/:id')
    .put(updateCorrectionType)
    .delete(deleteCorrectionType);

// --- Correction Reason Management ---
router.route('/correction-reasons')
    .get(getCorrectionReasonsAdmin)
    .post(createCorrectionReason);
router.route('/correction-reasons/:id')
    .put(updateCorrectionReason);

// --- Workflow Management ---
router.get('/workflows/all', getAllWorkflows);
router.post('/workflows/copy', copyWorkflow);
router.delete('/workflows', deleteWorkflow); 
router.route('/workflows')
    .get(getWorkflow)
    .post(updateWorkflow);
    
// --- Special Roles Management ---
router.get('/special-roles', getSpecialRoles);

// --- Email Template Management ---
router.route('/email-templates')
    .get(getEmailTemplates);
router.route('/email-templates/:id')
    .put(updateEmailTemplate);

// --- Special Approver Mappings Management ---
router.route('/special-approvers')
    .get(getSpecialApproverMappings)
    .post(updateSpecialApproverMappings);
    
module.exports = router;