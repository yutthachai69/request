// frontend/src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useAppNotification } from './AppNotificationContext';
import { useNotification } from './NotificationContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();
    const { refresh } = useAppNotification();
    const snackbar = useNotification();

    useEffect(() => {
        // ✅ เปิดใช้งาน Socket.IO
        if (user) {
            // ✅ กำหนด Socket URL และ path
            // สำหรับ development: ใช้ relative path ผ่าน Vite proxy
            // สำหรับ production: ใช้ full URL จาก environment variable
            let socketURL;
            let socketPath;
            
            if (import.meta.env.DEV) {
                // Development: ใช้ relative path (Vite proxy จะ forward ไปที่ backend)
                socketURL = undefined; // undefined = ใช้ current origin
                socketPath = '/requestonlineapi/socket.io/';
            } else {
                // Production: ใช้ full URL
                socketURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/requestonlineapi';
                socketPath = '/requestonlineapi/socket.io/';
            }
            
            const newSocket = io(socketURL, {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                path: socketPath,
                transports: ['websocket', 'polling'], // ✅ รองรับทั้ง WebSocket และ polling
                autoConnect: true,
                // ✅ เพิ่ม options สำหรับ development
                ...(import.meta.env.DEV && {
                    forceNew: true,
                    withCredentials: true
                })
            });

            setSocket(newSocket);

            // ✅ Event: Connection successful
            newSocket.on('connect', () => {
                console.log('✅ Socket.IO: Connected to server', newSocket.id);
                refresh(); // Refresh notifications when connected
            });

            // ✅ Event: Connection error
            newSocket.on('connect_error', (error) => {
                console.warn('⚠️ Socket.IO: Connection error', error.message);
                // ⚠️ ไม่แสดง error ให้ผู้ใช้ เพราะเป็น optional feature
                // ระบบยังทำงานได้ปกติ (แค่ไม่มี real-time)
            });

            // ✅ Event: Disconnect
            newSocket.on('disconnect', (reason) => {
                console.log('ℹ️ Socket.IO: Disconnected', reason);
                if (reason === 'io server disconnect') {
                    // Server disconnected, need to reconnect manually
                    newSocket.connect();
                }
            });

            // ✅ Event: Reconnection attempt
            newSocket.on('reconnect_attempt', (attemptNumber) => {
                console.log(`🔄 Socket.IO: Reconnecting... (attempt ${attemptNumber})`);
            });

            // ✅ Event: Reconnection successful
            newSocket.on('reconnect', (attemptNumber) => {
                console.log(`✅ Socket.IO: Reconnected after ${attemptNumber} attempts`);
                refresh();
            });

            // ✅ Event: Reconnection failed
            newSocket.on('reconnect_failed', () => {
                console.warn('⚠️ Socket.IO: Reconnection failed. System will continue without real-time updates.');
            });

            // ✅ Event: New request created
            newSocket.on('new_request', (data) => {
                console.log('📢 Socket.IO: New request event', data);
                refresh(); // Refresh notifications
                snackbar.showNotification(data.message || 'มีคำร้องใหม่', 'info');
            });

            // ✅ Event: Request updated
            newSocket.on('request_updated', (data) => {
                console.log('📢 Socket.IO: Request updated event', data);
                refresh();
                snackbar.showNotification(data.message || 'คำร้องถูกอัปเดต', 'info');
            });

            // ✅ Event: Request status changed
            newSocket.on('request_status_changed', (data) => {
                console.log('📢 Socket.IO: Request status changed event', data);
                refresh();
                snackbar.showNotification(data.message || 'สถานะคำร้องเปลี่ยน', 'info');
            });

            // ✅ Event: Request deleted
            newSocket.on('request_deleted', (data) => {
                console.log('📢 Socket.IO: Request deleted event', data);
                refresh();
                snackbar.showNotification(data.message || 'คำร้องถูกลบ', 'warning');
            });

            // ✅ Event: Parallel approval pending
            newSocket.on('parallel_approval_pending', (data) => {
                console.log('📢 Socket.IO: Parallel approval pending event', data);
                refresh();
            });

            // ✅ Cleanup on unmount
            return () => {
                console.log('🔌 Socket.IO: Cleaning up connection');
                newSocket.disconnect();
            };
        } else if (socket) {
            // ✅ Disconnect when user logs out
            socket.disconnect();
            setSocket(null);
        }
    }, [user, refresh, snackbar]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};