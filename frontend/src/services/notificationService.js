// frontend/src/services/notificationService.js
import api from './api';

const getNotifications = () => {
    return api.get('/notifications');
};

const markAsRead = (id) => {
    return api.put(`/notifications/${id}/read`);
};

// ===== ฟังก์ชันที่เพิ่มเข้ามาใหม่ =====
const markAllAsRead = () => {
    return api.put('/notifications/mark-all-read');
}
// ===================================

const notificationService = {
    getNotifications,
    markAsRead,
    markAllAsRead, // เพิ่มเข้าไปใน export
};

export default notificationService;