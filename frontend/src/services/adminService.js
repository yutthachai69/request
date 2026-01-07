// frontend/src/services/adminService.js
import api from './api';

const getUsers = (params) => api.get('/admin/users', { params });
const getUserById = (id) => api.get(`/admin/users/${id}`);
const updateUser = (id, userData) => api.put(`/admin/users/${id}`, userData);
const createUser = (userData) => api.post('/auth/register', userData);
const deleteUser = (id) => api.delete(`/admin/users/${id}`);
const resetUserPassword = (id, password) => {
    return api.put(`/admin/users/${id}/reset-password`, { password });
};

// --- Category Services ---
const getCategories = () => api.get('/master/categories');
const createCategory = (data) => api.post('/master/categories', data);
const updateCategory = (id, data) => api.put(`/master/categories/${id}`, data);
const deleteCategory = (id) => api.delete(`/master/categories/${id}`);

// --- Location Services ---
const getLocationsAdmin = () => api.get('/master/locations');
const createLocation = (payload) => api.post('/master/locations', payload);
const updateLocation = (id, payload) => api.put(`/master/locations/${id}`, payload);
const deleteLocation = (id) => api.delete(`/master/locations/${id}`);
const getCategoryMappingsForLocation = (id) => api.get(`/master/locations/${id}/categories`);

// --- Status Services ---
const getStatuses = () => api.get('/master/statuses');
const updateStatus = (id, statusData) => api.put(`/master/statuses/${id}`, statusData);

// --- Document Services ---
const getDocConfigs = () => api.get('/admin/doc-configs');
const saveDocConfig = (configData) => api.post('/admin/doc-configs', configData);

// --- Permission Services ---
const getUserPermissions = (id) => api.get(`/admin/users/${id}/permissions`);

// --- Correction Type Services (Admin) ---
const getCorrectionTypesAdmin = (params) => api.get('/admin/correction-types', { params });
const createCorrectionType = (data) => api.post('/admin/correction-types', data);
const updateCorrectionType = (id, data) => api.put(`/admin/correction-types/${id}`, data);
const deleteCorrectionType = (id) => api.delete(`/admin/correction-types/${id}`);
const getCategoryMappingsForType = (id) => api.get(`/admin/correction-types/${id}/categories`);

// --- Correction Reason Services (Admin) ---
const getCorrectionReasonsAdmin = () => api.get('/admin/correction-reasons');
const createCorrectionReason = (data) => api.post('/admin/correction-reasons', data);
const updateCorrectionReason = (id, data) => api.put(`/admin/correction-reasons/${id}`, data);

// --- Approver Mapping Services (Admin) ---
const getApproverMappingsForUser = (userId) => api.get(`/admin/users/${userId}/approver-mappings`);

// --- Workflow Services ---
const getAllWorkflows = () => api.get('/admin/workflows/all');
const getWorkflow = (categoryId, correctionTypeId) => api.get('/admin/workflows', { params: { categoryId, correctionTypeId } });
const updateWorkflow = (data) => api.post('/admin/workflows', data);
const copyWorkflow = (data) => api.post('/admin/workflows/copy', data);
const deleteWorkflow = (data) => api.delete('/admin/workflows', { data });

// --- Department Services ---
const getDepartments = () => api.get('/master/departments');
const createDepartment = (departmentName) => api.post('/master/departments', { departmentName });
const updateDepartment = (id, data) => api.put(`/master/departments/${id}`, data);
const deleteDepartment = (id) => api.delete(`/master/departments/${id}`);

// --- Special Roles Services ---
const getSpecialRoles = () => api.get('/admin/special-roles');
const getSpecialRolesForUser = (userId) => api.get(`/admin/users/${userId}/special-roles`);

// --- Roles Services ---
const getRoles = () => api.get('/admin/roles');
const createRole = (roleData) => api.post('/admin/roles', roleData);
const updateRole = (id, roleData) => api.put(`/admin/roles/${id}`, roleData);
const deleteRole = (id) => api.delete(`/admin/roles/${id}`);
const getActions = () => api.get('/admin/actions');

// --- Email Template Services ---
const getEmailTemplates = () => api.get('/admin/email-templates');
const updateEmailTemplate = (id, data) => api.put(`/admin/email-templates/${id}`, data);

// --- Special Approver Mappings Services ---
const getSpecialApproverMappings = (params) => api.get('/admin/special-approvers', { params });
const updateSpecialApproverMappings = (data) => api.post('/admin/special-approvers', data);

const getAuditLogs = (params) => api.get('/admin/audit-logs', { params });
const getAuditLogActions = () => api.get('/admin/audit-logs/actions');

// ✅ เพิ่มฟังก์ชันใหม่ตรงนี้ (เพื่อให้ Frontend ดึงข้อมูลรายงานได้)
const getOperationAuditReport = (params) => api.get('/admin/operation-audit-report', { params });

const adminService = {
    getUsers,
    getUserById,
    updateUser,
    createUser,
    deleteUser,
    resetUserPassword,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getLocationsAdmin,
    createLocation,
    updateLocation,
    deleteLocation,
    getCategoryMappingsForLocation,
    getStatuses,
    updateStatus,
    getDocConfigs,
    saveDocConfig,
    getUserPermissions,
    getCorrectionTypesAdmin,
    createCorrectionType,
    updateCorrectionType,
    deleteCorrectionType,
    getCategoryMappingsForType,
    getCorrectionReasonsAdmin,
    createCorrectionReason,
    updateCorrectionReason,
    getApproverMappingsForUser,
    getAllWorkflows,
    getWorkflow,
    updateWorkflow,
    copyWorkflow,
    deleteWorkflow,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
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
    getAuditLogActions,
    getOperationAuditReport // ✅ ส่งออกฟังก์ชันเพื่อให้หน้าเว็บเรียกใช้
};

export default adminService;