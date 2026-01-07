// frontend/src/components/NotificationBell.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNotification } from '../context/AppNotificationContext';
import { IconButton, Badge, Menu, MenuItem, Typography, Box, Divider, Tooltip, Button } from '@mui/material'; // เพิ่ม Button
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll'; // เพิ่มไอคอน

const NotificationBell = () => {
    const navigate = useNavigate();
    // ดึงฟังก์ชัน markAllAsRead มาจาก context
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useAppNotification(); 
    const [anchorEl, setAnchorEl] = useState(null);

    const handleOpenMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = (notification) => {
        handleCloseMenu();
        if (!notification.IsRead) {
            markAsRead(notification.NotificationID);
        }
        if (notification.RequestID) {
            navigate(`/request/${notification.RequestID}`);
        }
    };
    
    // ===== ฟังก์ชันสำหรับปุ่มใหม่ =====
    const handleMarkAllRead = () => {
        markAllAsRead();
        // ไม่ต้องปิดเมนูเพื่อให้ผู้ใช้เห็นว่าทุกอย่างอ่านแล้ว
    };
    // ===================================

    return (
        <>
            <Tooltip title="Notifications">
                <IconButton color="inherit" onClick={handleOpenMenu}>
                    <Badge badgeContent={unreadCount} color="error">
                        <NotificationsIcon />
                    </Badge>
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                sx={{ mt: 1, '& .MuiPaper-root': { width: 360 } }} // กำหนดความกว้างของเมนู
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ p: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{fontWeight: 'bold'}}>การแจ้งเตือน</Typography>
                </Box>
                <Divider />

                {/* ===== ส่วนที่เพิ่มปุ่มเข้ามา ===== */}
                {notifications.length > 0 && unreadCount > 0 && (
                     <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            size="small"
                            onClick={handleMarkAllRead}
                            startIcon={<DoneAllIcon />}
                        >
                            อ่านทั้งหมด
                        </Button>
                    </Box>
                )}
                {/* =============================== */}

                {notifications.length > 0 ? (
                    notifications.slice(0, 5).map(notif => (
                        <MenuItem 
                            key={notif.NotificationID} 
                            onClick={() => handleNotificationClick(notif)}
                            sx={{
                                backgroundColor: notif.IsRead ? 'transparent' : 'action.hover',
                                whiteSpace: 'normal',
                                py: 1.5
                            }}
                        >
                           <Box>
                               <Typography variant="body2">{notif.Message}</Typography>
                               <Typography variant="caption" color="text.secondary">
                                   {new Date(notif.CreatedAt).toLocaleString('th-TH')}
                               </Typography>
                           </Box>
                        </MenuItem>
                    ))
                ) : (
                    <MenuItem disabled>
                        <Typography variant="body2" color="text.secondary" sx={{p: 2}}>No new notifications</Typography>
                    </MenuItem>
                )}
            </Menu>
        </>
    );
};

export default NotificationBell;