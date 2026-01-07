import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const StatusContext = createContext(null);

export const useStatuses = () => useContext(StatusContext);

export const StatusProvider = ({ children }) => {
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchStatuses = () => {
        if (user) {
            setLoading(true);
            api.get('/master/statuses')
                .then(res => {
                    setStatuses(res.data);
                })
                .catch(err => {
                    console.error("Cannot fetch statuses for context", err);
                    setStatuses([]);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setStatuses([]);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatuses();
    }, [user]);

    const getStatusByCode = (statusCode) => {
        return statuses.find(s => s.StatusCode === statusCode);
    };

    // ===== เพิ่มฟังก์ชันนี้เข้ามา =====
    const getStatusNameByCode = (statusCode) => {
        const status = statuses.find(s => s.StatusCode === statusCode);
        return status ? status.StatusName : statusCode; // คืนค่าเป็นชื่อสถานะ ถ้าไม่เจอก็คืนค่า code เดิมไปก่อน
    };
    // ===============================

    const getStatusByLevel = (level) => {
        return statuses.find(s => s.StatusLevel === level);
    };

    // ===== เพิ่ม getStatusNameByCode เข้าไปใน value ที่จะส่งออก =====
    const value = { statuses, loading, getStatusByCode, getStatusNameByCode, getStatusByLevel, refreshStatuses: fetchStatuses };
    // ========================================================

    return (
        <StatusContext.Provider value={value}>
            {!loading && children}
        </StatusContext.Provider>
    );
};