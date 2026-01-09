// frontend/src/pages/admin/UserManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, Tooltip, Chip, CircularProgress,
    TextField, InputAdornment, Pagination, Dialog, DialogActions, DialogContent, 
    DialogTitle, DialogContentText
} from '@mui/material';
import adminService from '../../services/adminService';
import { motion } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

const UserManagementPage = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0, limit: 50 });

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const loadUsers = React.useCallback(() => {
        setLoading(true);
        const params = {
            search: debouncedSearchTerm,
            page: pagination.currentPage,
            limit: pagination.limit
        };
        adminService.getUsers(params)
            .then(res => {
                setUsers(res.data.users);
                setPagination(prev => ({ 
                    ...prev, 
                    totalPages: res.data.totalPages,
                    totalCount: res.data.totalCount || 0
                }));
            })
            .catch(err => notification.showNotification('Could not load user data', 'error'))
            .finally(() => setLoading(false));
    }, [debouncedSearchTerm, pagination.currentPage, pagination.limit, notification]);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPagination(p => ({ ...p, currentPage: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handlePageChange = (event, value) => {
        setPagination(p => ({ ...p, currentPage: value }));
    };

    const handleOpenConfirm = (e, user) => {
        e.stopPropagation();
        setItemToDelete(user);
        setConfirmOpen(true);
    };

    const handleCloseConfirm = () => {
        setItemToDelete(null);
        setConfirmOpen(false);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        try {
            await adminService.deleteUser(itemToDelete.UserID);
            notification.showNotification(`ลบผู้ใช้ "${itemToDelete.Username}" สำเร็จ`, 'success');
            loadUsers();
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
        } finally {
            handleCloseConfirm();
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
    };
    
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>จัดการผู้ใช้งาน</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/admin/users/new')} sx={{ borderRadius: '12px', px: 3 }}>
                    สร้างผู้ใช้ใหม่
                </Button>
            </Box>

            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <TextField fullWidth variant="outlined" placeholder="ค้นหาด้วยชื่อ หรือ Username..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }}
                />
                {!loading && pagination.totalCount > 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        พบทั้งหมด {pagination.totalCount} รายการ
                    </Typography>
                )}
            </Box>

            {loading ? ( <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box> ) : (
                <>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ชื่อผู้ใช้ (Username)</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ชื่อ-นามสกุล</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>แผนก</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>สิทธิ์ (Role)</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>สถานะ</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>เครื่องมือ</TableCell>
                                </TableRow>
                            </TableHead>
                            <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                                {users.map(user => (
                                    <motion.tr component={TableRow} hover key={user.UserID} variants={itemVariants} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/users/edit/${user.UserID}`)}>
                                        <TableCell>{user.Username}</TableCell>
                                        <TableCell>{user.FullName}</TableCell>
                                        <TableCell>{user.DepartmentName || '—'}</TableCell>
                                        <TableCell>{user.RoleName || '—'}</TableCell>
                                        <TableCell align="center"><Chip label={user.IsActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} color={user.IsActive ? 'success' : 'default'} size="small" /></TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="แก้ไขผู้ใช้">
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/edit/${user.UserID}`); }}>
                                                    <EditIcon fontSize="inherit" />
                                                </IconButton>
                                            </Tooltip>
                                            {currentUser?.id !== user.UserID && (
                                                <Tooltip title="ลบผู้ใช้">
                                                    <IconButton size="small" color="error" onClick={(e) => handleOpenConfirm(e, user)}>
                                                        <DeleteIcon fontSize="inherit" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </motion.tbody>
                        </Table>
                    </TableContainer>

                    {pagination.totalPages > 1 && (
                         <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3 }}>
                            <Pagination count={pagination.totalPages} page={pagination.currentPage} onChange={handlePageChange} color="primary" />
                        </Box>
                    )}
                </>
            )}

            {itemToDelete && (
                 <Dialog open={confirmOpen} onClose={handleCloseConfirm}>
                    <DialogTitle>ยืนยันการลบ</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            คุณต้องการลบผู้ใช้ "{itemToDelete.FullName}" ({itemToDelete.Username}) จริงหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseConfirm}>ยกเลิก</Button>
                        <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>ยืนยันการลบ</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Paper>
    );
};

export default UserManagementPage;