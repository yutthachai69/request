// frontend/src/pages/admin/CorrectionReasonPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, Tooltip, Chip, Switch,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, CircularProgress
} from '@mui/material';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import { motion } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

const CorrectionReasonPage = () => {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const notification = useNotification();

    const loadReasons = React.useCallback(() => {
        setLoading(true);
        adminService.getCorrectionReasonsAdmin()
            .then(res => setReasons(res.data))
            .catch(() => notification.showNotification('ไม่สามารถโหลดข้อมูลเหตุผลได้', 'error'))
            .finally(() => setLoading(false));
    }, [notification]);

    useEffect(() => {
        loadReasons();
    }, [loadReasons]);

    const handleOpen = (item = null) => {
        setCurrentItem({
            ReasonID: item?.ReasonID || null,
            ReasonText: item?.ReasonText || '',
            IsActive: item ? !!item.IsActive : true,
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentItem(null);
    };
    
    const handleSave = async () => {
        if (!currentItem || !currentItem.ReasonText.trim()) {
            notification.showNotification('กรุณากรอกเหตุผลการแก้ไข', 'warning');
            return;
        }

        const data = {
            reasonText: currentItem.ReasonText,
            isActive: currentItem.IsActive,
        };

        try {
            if (currentItem.ReasonID) {
                await adminService.updateCorrectionReason(currentItem.ReasonID, data);
                notification.showNotification('อัปเดตเหตุผลสำเร็จ', 'success');
            } else {
                await adminService.createCorrectionReason(data);
                notification.showNotification('สร้างเหตุผลใหม่สำเร็จ', 'success');
            }
            loadReasons();
            handleClose();
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: 'grey.50' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>จัดการเหตุผลการแก้ไข</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: '12px', px: 3 }}>
                    สร้างเหตุผลใหม่
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
                                <TableCell sx={{ fontWeight: 'bold' }}>ข้อความ</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', width: '15%' }}>สถานะ</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', width: '15%' }}>เครื่องมือ</TableCell>
                            </TableRow>
                        </TableHead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                            {reasons.map(reason => (
                                <motion.tr component={TableRow} hover key={reason.ReasonID} variants={itemVariants}>
                                    <TableCell>{reason.ReasonID}</TableCell>
                                    <TableCell>{reason.ReasonText}</TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        <Chip label={reason.IsActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} color={reason.IsActive ? 'success' : 'default'} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="แก้ไข">
                                            <IconButton size="small" onClick={() => handleOpen(reason)}><EditIcon fontSize="inherit" /></IconButton>
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
                    <DialogTitle>{currentItem.ReasonID ? 'แก้ไข' : 'สร้าง'}เหตุผลการแก้ไข</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="ข้อความ"
                            value={currentItem.ReasonText}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, ReasonText: e.target.value }))}
                            fullWidth
                            required
                            multiline
                            rows={3}
                            sx={{mt: 2}}
                        />
                        <Switch
                            checked={currentItem.IsActive}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, IsActive: e.target.checked }))}
                        />
                         <Typography variant="caption" sx={{ color: 'text.secondary', verticalAlign: 'middle' }}>
                            {currentItem.IsActive ? 'สถานะ: เปิดใช้งาน' : 'สถานะ: ปิดใช้งาน'}
                         </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>ยกเลิก</Button>
                        <Button onClick={handleSave} variant="contained">บันทึก</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Paper>
    );
};
export default CorrectionReasonPage;