// frontend/src/context/AppNotificationContext.jsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';

const AppNotificationContext = createContext(null);

export const useAppNotification = () => useContext(AppNotificationContext);

export const AppNotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const { user } = useAuth();

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const res = await notificationService.getNotifications();
            // ===== START: เพิ่มการตรวจสอบข้อมูลที่นี่ =====
            if (Array.isArray(res.data)) {
                setNotifications(res.data);
            } else {
                // ถ้าข้อมูลที่ได้มาไม่ใช่ Array ให้ใช้ Array ว่างแทนเพื่อป้องกัน Error
                console.error("Received non-array data for notifications:", res.data);
                setNotifications([]);
            }
            // ===== END: เพิ่มการตรวจสอบข้อมูลที่นี่ =====
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
            setNotifications([]); // กรณีเกิด Error ก็ให้เป็น Array ว่าง
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        // การตั้งเวลาดึงข้อมูลซ้ำอาจทำให้เกิด request ค้างเยอะตอนมีปัญหา
        // เราอาจจะปิดส่วนนี้ไปก่อนชั่วคราวเพื่อดู error ที่แท้จริง
        // const interval = setInterval(fetchNotifications, 60000); 
        // return () => clearInterval(interval);
    }, [fetchNotifications]);

    const markAsRead = async (id) => {
        try {
            setNotifications(prev => 
                prev.map(n => n.NotificationID === id ? { ...n, IsRead: true } : n)
            );
            await notificationService.markAsRead(id);
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
            fetchNotifications();
        }
    };

    const markAllAsRead = async () => {
        try {
            setNotifications(prev => prev.map(n => ({ ...n, IsRead: true })));
            await notificationService.markAllAsRead();
        } catch (error) {
            console.error("Failed to mark all as read:", error);
            fetchNotifications();
        }
    };
    
    // บรรทัดนี้จะปลอดภัยแล้วเพราะ state `notifications` จะเป็น Array เสมอ
    const unreadCount = notifications.filter(n => !n.IsRead).length;

    const value = { notifications, unreadCount, markAsRead, markAllAsRead, refresh: fetchNotifications };

    return (
        <AppNotificationContext.Provider value={value}>
            {children}
        </AppNotificationContext.Provider>
    );
};