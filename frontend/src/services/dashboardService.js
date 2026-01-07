// frontend/src/services/dashboardService.js
import api from './api';

const getCategoryStatistics = () => {
    return api.get('/dashboard/category-stats');
};

const getGlobalStatistics = () => {
    return api.get('/dashboard/statistics');
};

// ===== START: เพิ่มฟังก์ชันใหม่ =====
const getReportData = (params) => {
    return api.get('/dashboard/report-data', { params });
};
// ===== END: เพิ่มฟังก์ชันใหม่ =====

const dashboardService = {
    getCategoryStatistics,
    getGlobalStatistics,
    getReportData, // เพิ่มเข้าไปใน export
};

export default dashboardService;