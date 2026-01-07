// frontend/src/components/AdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // เปลี่ยนมาใช้ useAuth เพื่อความสอดคล้อง
import MainLayout from './MainLayout';

const AdminRoute = ({ children }) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" />;
    }

    // --- REFACTORED: Check by roleName ---
    if (user.roleName !== 'Admin') {
        return <Navigate to="/" />; // ถ้าไม่ใช่ Admin ให้ไปหน้าหลัก
    }

    return <MainLayout>{children}</MainLayout>;
};

export default AdminRoute;