// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // user object ที่ได้จาก authService.getCurrentUser() จะมี roleId, roleName อยู่แล้ว
    const [user, setUser] = useState(authService.getCurrentUser());
    const navigate = useNavigate();

    const login = async (username, password) => {
        try {
            // authService.login จะคืน user object ที่มี roleId, roleName กลับมา
            const response = await authService.login(username, password);
            setUser(response.user);
            navigate('/', { replace: true });
            return response;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        navigate('/login', { replace: true });
    };

    // ค่า user ที่ส่งออกไปจะถูกอัปเดตโดยอัตโนมัติ
    const value = { user, login, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};