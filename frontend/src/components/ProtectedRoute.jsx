// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MainLayout from './MainLayout';

// --- REFACTORED: Use allowedRoles instead of allowedLevels ---
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (!allowedRoles.includes(user.roleName)) {
        // ถ้า Role ไม่ได้รับอนุญาต ให้กลับไปหน้าหลัก
        return <Navigate to="/" />; 
    }

    return <MainLayout>{children}</MainLayout>;
};

export default ProtectedRoute;