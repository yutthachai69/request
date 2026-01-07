// frontend/src/pages/admin/DepartmentManagementPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, Tooltip, Chip, Switch,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, FormControlLabel, CircularProgress,
    DialogContentText
} from '@mui/material';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

const DepartmentManagementPage = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const notification = useNotification();

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const loadDepartments = React.useCallback(() => {
        setLoading(true);
        adminService.getDepartments()
            .then(res => setDepartments(res.data))
            .catch(() => notification.showNotification('ไม่สามารถโหลดข้อมูลแผนกได้', 'error'))
            .finally(() => setLoading(false));
    }, [notification]);

    useEffect(() => {
        loadDepartments();
    }, [loadDepartments]);

    const handleOpen = (item = null) => {
        setCurrentItem({
            DepartmentID: item?.DepartmentID || null,
            DepartmentName: item?.DepartmentName || '',
            IsActive: item ? !!item.IsActive : true,
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentItem(null);
    };
    
    const handleSave = async () => {
        if (!currentItem || !currentItem.DepartmentName.trim()) {
            notification.showNotification('กรุณากรอกชื่อแผนก', 'warning');
            return;
        }

        const data = {
            departmentName: currentItem.DepartmentName,
            isActive: currentItem.IsActive,
        };

        try {
            if (currentItem.DepartmentID) {
                await adminService.updateDepartment(currentItem.DepartmentID, data);
                notification.showNotification('อัปเดตข้อมูลแผนกสำเร็จ', 'success');
            } else {
                await adminService.createDepartment(data.departmentName);
                notification.showNotification('สร้างแผนกใหม่สำเร็จ', 'success');
            }
            loadDepartments();
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
            await adminService.deleteDepartment(itemToDelete.DepartmentID);
            notification.showNotification(`ลบแผนก "${itemToDelete.DepartmentName}" สำเร็จ`, 'success');
            loadDepartments();
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
        } finally {
            handleCloseConfirm();
        }
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: 'grey.50' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>จัดการแผนก</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: '12px', px: 3 }}>
                    สร้างแผนกใหม่
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
                                <TableCell sx={{ fontWeight: 'bold' }}>ชื่อแผนก</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>สถานะ</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>เครื่องมือ</TableCell>
                            </TableRow>
                        </TableHead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                            {departments.map(dept => (
                                <motion.tr component={TableRow} hover key={dept.DepartmentID} variants={itemVariants}>
                                    <TableCell>{dept.DepartmentID}</TableCell>
                                    <TableCell>{dept.DepartmentName}</TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        <Chip label={dept.IsActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} color={dept.IsActive ? 'success' : 'default'} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="แก้ไข">
                                            <IconButton size="small" onClick={() => handleOpen(dept)}><EditIcon fontSize="inherit" /></IconButton>
                                        </Tooltip>
                                        <Tooltip title="ลบ">
                                            <IconButton size="small" onClick={() => handleOpenConfirm(dept)} color="error"><DeleteIcon fontSize="inherit" /></IconButton>
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
                    <DialogTitle>{currentItem.DepartmentID ? 'แก้ไข' : 'สร้าง'}แผนก</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="ชื่อแผนก"
                            value={currentItem.DepartmentName}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, DepartmentName: e.target.value }))}
                            fullWidth
                            required
                            sx={{mt: 2}}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={currentItem.IsActive}
                                    onChange={(e) => setCurrentItem(prev => ({ ...prev, IsActive: e.target.checked }))}
                                />
                            }
                            label={currentItem.IsActive ? 'สถานะ: เปิดใช้งาน' : 'สถานะ: ปิดใช้งาน'}
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
                            คุณต้องการลบแผนก "{itemToDelete.DepartmentName}" จริงหรือไม่?
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
export default DepartmentManagementPage;