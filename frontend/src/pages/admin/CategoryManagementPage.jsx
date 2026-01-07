// frontend/src/pages/admin/CategoryManagementPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, Tooltip, Chip, Switch,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, FormControlLabel,
    CircularProgress, DialogContentText
} from '@mui/material';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import { motion } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

const CategoryManagementPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const notification = useNotification();

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const loadCategories = React.useCallback(() => {
        setLoading(true);
        adminService.getCategories()
            .then(res => setCategories(res.data))
            .catch(() => notification.showNotification('ไม่สามารถโหลดข้อมูลหมวดหมู่ได้', 'error'))
            .finally(() => setLoading(false));
    }, [notification]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const handleOpen = (item = null) => {
        setCurrentItem({
            CategoryID: item?.CategoryID || null,
            CategoryName: item?.CategoryName || '',
            RequiresCCSClosing: item ? !!item.RequiresCCSClosing : false,
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentItem(null);
    };
    
    const handleSave = async () => {
        if (!currentItem || !currentItem.CategoryName.trim()) {
            notification.showNotification('กรุณากรอกชื่อหมวดหมู่', 'warning');
            return;
        }

        const data = {
            name: currentItem.CategoryName,
            requiresCCSClosing: currentItem.RequiresCCSClosing,
        };

        try {
            if (currentItem.CategoryID) {
                await adminService.updateCategory(currentItem.CategoryID, data);
                notification.showNotification('อัปเดตหมวดหมู่สำเร็จ', 'success');
            } else {
                await adminService.createCategory(data); 
                notification.showNotification('สร้างหมวดหมู่ใหม่สำเร็จ', 'success');
            }
            loadCategories();
            handleClose();
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
    };
    
    const handleOpenConfirm = (item) => {
        setItemToDelete(item);
        setConfirmOpen(true);
    };

    const handleCloseConfirm = () => {
        setItemToDelete(null);
        setConfirmOpen(false);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        try {
            await adminService.deleteCategory(itemToDelete.CategoryID);
            notification.showNotification(`ลบหมวดหมู่ "${itemToDelete.CategoryName}" สำเร็จ`, 'success');
            loadCategories();
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
        } finally {
            handleCloseConfirm();
        }
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: 'grey.50' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>จัดการหมวดหมู่</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: '12px', px: 3 }}>
                    สร้างหมวดหมู่ใหม่
                </Button>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>ชื่อหมวดหมู่</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>ต้องให้บัญชีปิดงาน</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>เครื่องมือ</TableCell>
                            </TableRow>
                        </TableHead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                            {categories.map(cat => (
                                <motion.tr component={TableRow} hover key={cat.CategoryID} variants={itemVariants}>
                                    <TableCell>{cat.CategoryID}</TableCell>
                                    <TableCell>{cat.CategoryName}</TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        {cat.RequiresCCSClosing ? 
                                            <Chip label="ใช่" color="primary" size="small" variant="outlined" /> : 
                                            <Chip label="ไม่" size="small" />}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="แก้ไข">
                                            <IconButton size="small" onClick={() => handleOpen(cat)}><EditIcon fontSize="inherit" /></IconButton>
                                        </Tooltip>
                                        <Tooltip title="ลบ">
                                            <IconButton size="small" onClick={() => handleOpenConfirm(cat)} color="error"><DeleteIcon fontSize="inherit" /></IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </motion.tbody>
                    </Table>
                </TableContainer>
            )}

            {currentItem && (
                <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                    <DialogTitle>{currentItem.CategoryID ? 'แก้ไข' : 'สร้าง'}หมวดหมู่</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="ชื่อหมวดหมู่"
                            value={currentItem.CategoryName}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, CategoryName: e.target.value }))}
                            fullWidth
                            required
                            sx={{mt: 2}}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={currentItem.RequiresCCSClosing}
                                    onChange={(e) => setCurrentItem(prev => ({ ...prev, RequiresCCSClosing: e.target.checked }))}
                                />
                            }
                            label="ต้องให้ฝ่ายบัญชี (CCS) เป็นผู้ปิดงานขั้นสุดท้าย"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>ยกเลิก</Button>
                        <Button onClick={handleSave} variant="contained">บันทึก</Button>
                    </DialogActions>
                </Dialog>
            )}

            {itemToDelete && (
                 <Dialog
                    open={confirmOpen}
                    onClose={handleCloseConfirm}
                >
                    <DialogTitle>ยืนยันการลบ</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            คุณต้องการลบหมวดหมู่ "{itemToDelete.CategoryName}" จริงหรือไม่?
                            การกระทำนี้ไม่สามารถย้อนกลับได้
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseConfirm}>ยกเลิก</Button>
                        <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
                            ยืนยันการลบ
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Paper>
    );
};
export default CategoryManagementPage;