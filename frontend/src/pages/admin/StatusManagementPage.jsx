// frontend/src/pages/admin/StatusManagementPage.jsx
import React, { useState } from 'react';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import { useStatuses } from '../../context/StatusContext';
import {
    Paper, Typography, Box, Button, IconButton, TextField, Dialog,
    DialogActions, DialogContent, DialogTitle, Tooltip, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Stack
} from '@mui/material';
import { motion } from 'framer-motion';
import EditIcon from '@mui/icons-material/Edit';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

const StatusManagementPage = () => {
    const { statuses, loading, refreshStatuses } = useStatuses();
    const [open, setOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('#cccccc'); // State สำหรับเก็บสี
    const notification = useNotification();

    const handleOpen = (item) => {
        setCurrentItem(item);
        setEditName(item.StatusName);
        setEditColor(item.ColorCode || '#cccccc'); // ตั้งค่าสีเริ่มต้น
        setOpen(true);
    };

    const handleClose = () => setOpen(false);

    const handleSave = () => {
        if (!editName.trim()) {
            notification.showNotification('ชื่อสถานะห้ามว่าง', 'warning');
            return;
        }
        // ===== START: แก้ไขส่วนนี้ =====
        const dataToUpdate = { 
            name: editName,
            colorCode: editColor // ส่งค่าสีไปด้วย
        };
        adminService.updateStatus(currentItem.StatusID, dataToUpdate)
            .then(() => {
                notification.showNotification('อัปเดตชื่อสถานะสำเร็จ!', 'success');
                refreshStatuses();
                handleClose();
            }).catch(err => notification.showNotification(`เกิดข้อผิดพลาด: ${err.response?.data?.message || err.message}`, 'error'));
        // ===== END: แก้ไขส่วนนี้ =====
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: 'grey.50' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>จัดการสถานะ</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                คุณสามารถแก้ไข "ชื่อที่แสดงผล" และ "สี" ของแต่ละสถานะได้ที่หน้านี้
            </Typography>

            {loading ? (
                 <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>รหัสสถานะ (ในระบบ)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>ชื่อสถานะ (ที่แสดงผล)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>เครื่องมือ</TableCell>
                            </TableRow>
                        </TableHead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                            {statuses.map(item => (
                                <motion.tr component={TableRow} key={item.StatusID} variants={itemVariants}>
                                    <TableCell>
                                        <Typography sx={{fontFamily: 'monospace', color: 'text.secondary'}}>{item.StatusCode}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {/* ===== START: แก้ไขส่วนนี้ ===== */}
                                        <Chip 
                                            label={item.StatusName} 
                                            size="small" 
                                            sx={{ 
                                                backgroundColor: item.ColorCode || '#e0e0e0', // ใช้สีจาก DB หรือสีเทาถ้าไม่มี
                                                color: (theme) => theme.palette.getContrastText(item.ColorCode || '#e0e0e0')
                                            }}
                                        />
                                        {/* ===== END: แก้ไขส่วนนี้ ===== */}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="แก้ไขชื่อที่แสดงผล">
                                            <IconButton size="small" onClick={() => handleOpen(item)}>
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </motion.tbody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>แก้ไขชื่อสถานะ</DialogTitle>
                <DialogContent>
                    {/* ===== START: แก้ไขส่วนนี้ ===== */}
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="ชื่อสถานะ (ที่แสดงผล)"
                            fullWidth
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            helperText={`สำหรับรหัสสถานะ: ${currentItem?.StatusCode}`}
                        />
                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>เลือกสี</Typography>
                            <input 
                                type="color"
                                value={editColor}
                                onChange={(e) => setEditColor(e.target.value)}
                                style={{ width: '100%', height: '40px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                            />
                        </Box>
                    </Stack>
                    {/* ===== END: แก้ไขส่วนนี้ ===== */}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>ยกเลิก</Button>
                    <Button onClick={handleSave} variant="contained">บันทึก</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};
export default StatusManagementPage;