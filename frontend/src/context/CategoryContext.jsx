// src/context/CategoryContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const CategoryContext = createContext(null);

export const useCategories = () => useContext(CategoryContext);

export const CategoryProvider = ({ children }) => {
    const [categories, setCategories] = useState([]);
    const { user } = useAuth(); // ดึงข้อมูล user จาก AuthContext

    useEffect(() => {
        if (user) {
            const categoryPromise = user.level === 0 
                ? api.get('/master/categories') 
                : api.get('/master/my-categories');
            
            categoryPromise
                .then(res => setCategories(res.data))
                .catch(err => {
                    console.error("Cannot fetch categories for context", err);
                    setCategories([]);
                });
        } else {
            setCategories([]); // ถ้า logout ให้ล้างค่า
        }
    }, [user]); // ทำงานใหม่เฉพาะเมื่อ user เปลี่ยน (login/logout)

    return (
        <CategoryContext.Provider value={{ categories }}>
            {children}
        </CategoryContext.Provider>
    );
};