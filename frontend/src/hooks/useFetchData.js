// frontend/src/hooks/useFetchData.js
import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';

/**
 * Custom Hook สำหรับดึงข้อมูลจาก API
 * @param {Function} apiFunc - ฟังก์ชัน service ที่จะใช้ในการดึงข้อมูล (เช่น adminService.getUsers)
 * @param {Array} initialData - ข้อมูลเริ่มต้นสำหรับ state (ปกติจะเป็น array ว่าง)
 * @returns {Object} - { data, loading, error, refresh, setData }
 */
const useFetchData = (apiFunc, initialData = []) => {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const notification = useNotification();

    const fetchData = useCallback(() => {
        setLoading(true);
        apiFunc()
            .then(res => {
                setData(res.data);
            })
            .catch(err => {
                const message = err.response?.data?.message || `Could not load data`;
                setError(message);
                notification.showNotification(message, 'error');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [apiFunc, notification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // เรา return `refresh` และ `setData` ไปด้วยเผื่อกรณีที่ต้องการ refresh ข้อมูลหรือแก้ไข state จากภายนอก
    return { data, loading, error, refresh: fetchData, setData };
};

export default useFetchData;