// frontend/src/pages/admin/RoleManagementPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, Tooltip, CircularProgress,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, Switch, FormControlLabel,
    DialogContentText
} from '@mui/material';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import { motion } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

const RoleManagementPage = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const notification = useNotification();

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const loadRoles = React.useCallback(() => {
        setLoading(true);
        adminService.getRoles()
            .then(res => setRoles(res.data))
            .catch(() => notification.showNotification('ไม่สามารถโหลดข้อมูล Role ได้', 'error'))
            .finally(() => setLoading(false));
    }, [notification]);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    const handleOpenDialog = (item = null) => {
        setCurrentItem(item ? { ...item } : { RoleName: '', Description: '', AllowBulkActions: false });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setCurrentItem(null);
    };

    const handleSave = async () => {
        if (!currentItem || !currentItem.RoleName.trim()) {
            notification.showNotification('กรุณากรอกชื่อ Role', 'warning');
            return;
        }

        try {
            if (currentItem.RoleID) {
                await adminService.updateRole(currentItem.RoleID, currentItem);
                notification.showNotification('อัปเดต Role สำเร็จ', 'success');
            } else {
                await adminService.createRole(currentItem);
                notification.showNotification('สร้าง Role ใหม่สำเร็จ', 'success');
            }
            loadRoles();
            handleCloseDialog();
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
            await adminService.deleteRole(itemToDelete.RoleID);
            notification.showNotification(`ลบ Role "${itemToDelete.RoleName}" สำเร็จ`, 'success');
            loadRoles();
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
        } finally {
            handleCloseConfirm();
        }
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: 'grey.50' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>จัดการบทบาท (Roles)</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ borderRadius: '12px', px: 3 }}>
                    สร้าง Role ใหม่
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
                                <TableCell sx={{ fontWeight: 'bold' }}>ชื่อ Role (ในระบบ)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>คำอธิบาย (แสดงผล)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Bulk Actions</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>เครื่องมือ</TableCell>
                            </TableRow>
                        </TableHead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                            {roles.map(role => (
                                <motion.tr component={TableRow} hover key={role.RoleID} variants={itemVariants}>
                                    <TableCell sx={{fontFamily: 'monospace', color: 'text.secondary'}}>{role.RoleName}</TableCell>
                                    <TableCell sx={{fontWeight: 500}}>{role.Description}</TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        {role.AllowBulkActions && <CheckCircleIcon color="success" />}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="แก้ไข">
                                            <IconButton size="small" onClick={() => handleOpenDialog(role)}><EditIcon fontSize="inherit" /></IconButton>
                                        </Tooltip>
                                        {![1, 2].includes(role.RoleID) && (
                                            <Tooltip title="ลบ">
                                                <IconButton size="small" onClick={() => handleOpenConfirm(role)} color="error"><DeleteIcon fontSize="inherit" /></IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </motion.tbody>
                    </Table>
                </TableContainer>
            )}

            {currentItem && (
                <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                    <DialogTitle>{currentItem.RoleID ? 'แก้ไข' : 'สร้าง'} Role</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="ชื่อ Role (ภาษาอังกฤษเท่านั้น, ไม่มีเว้นวรรค)"
                            value={currentItem.RoleName}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, RoleName: e.target.value }))}
                            fullWidth
                            required
                            sx={{mt: 2}}
                            helperText="เช่น Admin, Requester (ไม่สามารถแก้ไขได้หลังสร้างแล้ว)"
                            disabled={!!currentItem.RoleID}
                        />
                        <TextField
                            margin="dense"
                            label="คำอธิบาย (ภาษาไทย, สำหรับแสดงผล)"
                            value={currentItem.Description}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, Description: e.target.value }))}
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!currentItem.AllowBulkActions}
                                    onChange={(e) => setCurrentItem(prev => ({ ...prev, AllowBulkActions: e.target.checked }))}
                                />
                            }
                            label="อนุญาตให้ใช้ฟังก์ชัน Bulk Actions"
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>ยกเลิก</Button>
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
                            คุณต้องการลบ Role "{itemToDelete.RoleName}" จริงหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
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
export default RoleManagementPage;