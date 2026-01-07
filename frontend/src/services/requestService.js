// frontend/src/services/requestService.js
import api from './api';

const getRequests = (params) => {
  return api.get('/requests', { params });
};

const getRequestById = (id) => {
  return api.get(`/requests/${id}`);
};

const performAction = (id, actionData) => {
  return api.post(`/requests/${id}/action`, actionData);
};

// ===== START: เพิ่มฟังก์ชันใหม่ =====
const performBulkAction = (actionData) => {
  // actionData should be { requestIds: [...], actionName: '...', comment: '...' }
  return api.post('/requests/bulk-action', actionData);
};
// ===== END: เพิ่มฟังก์ชันใหม่ =====

const createRequest = (formData) => {
  return api.post('/requests', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

const exportRequests = (params) => {
  return api.get('/requests/export', {
    params,
    responseType: 'blob' // 💡 จุดสำคัญ: ต้องระบุเพื่อรับข้อมูลเป็นไฟล์ Excel
  });
};

const getApprovalHistory = (params) => {
  return api.get('/requests/history', { params });
};

const updateRequest = (id, data) => {
  return api.put(`/requests/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

const deleteRequest = (id) => {
  return api.delete(`/requests/${id}`);
};

const getWorkflowPreview = (params) => {
  return api.get('/master/workflow-preview', { params });
};

const getRequestCorrectionTypes = (id) => {
  return api.get(`/requests/${id}/correction-types`);
};

const requestService = {
  getRequests,
  getRequestById,
  performAction,
  performBulkAction, // เพิ่มเข้าไปใน export
  createRequest,
  exportRequests,
  getApprovalHistory,
  updateRequest,
  deleteRequest,
  getWorkflowPreview,
  getRequestCorrectionTypes
};

export default requestService;