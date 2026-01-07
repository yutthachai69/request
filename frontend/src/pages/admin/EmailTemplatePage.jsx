// frontend/src/pages/admin/EmailTemplatePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, Tooltip, CircularProgress,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, Alert, Stack, Chip
} from '@mui/material';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import EditIcon from '@mui/icons-material/Edit';

const EmailTemplatePage = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const notification = useNotification();

    const loadTemplates = useCallback(() => {
        setLoading(true);
        adminService.getEmailTemplates()
            .then(res => setTemplates(res.data))
            .catch(() => notification.showNotification('ไม่สามารถโหลดข้อมูล Template ได้', 'error'))
            .finally(() => setLoading(false));
    }, [notification]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const handleOpen = (item) => {
        setCurrentItem({ ...item });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentItem(null);
    };

    const handleSave = async () => {
        if (!currentItem) return;
        try {
            const data = { subject: currentItem.Subject, body: currentItem.Body };
            await adminService.updateEmailTemplate(currentItem.TemplateID, data);
            notification.showNotification('บันทึก Template สำเร็จ', 'success');
            loadTemplates();
            handleClose();
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
        }
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>จัดการ Email Templates</Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
                คุณสามารถแก้ไขหัวข้อและเนื้อหาของอีเมลที่จะถูกส่งอัตโนมัติจากระบบได้ที่นี่ (รองรับ HTML)
            </Alert>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>ชื่อ Template (ในระบบ)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>คำอธิบาย</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>หัวข้ออีเมล</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>เครื่องมือ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {templates.map(template => (
                                <TableRow hover key={template.TemplateID}>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{template.TemplateName}</TableCell>
                                    <TableCell>{template.Description}</TableCell>
                                    <TableCell>{template.Subject}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="แก้ไข"><IconButton onClick={() => handleOpen(template)}><EditIcon /></IconButton></Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {currentItem && (
                <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
                    <DialogTitle>แก้ไข Template: {currentItem.TemplateName}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{ pt: 1 }}>
                            <TextField
                                margin="dense"
                                label="หัวข้ออีเมล (Subject)"
                                value={currentItem.Subject}
                                onChange={(e) => setCurrentItem(p => ({ ...p, Subject: e.target.value }))}
                                fullWidth
                            />
                            <TextField
                                margin="dense"
                                label="เนื้อหาอีเมล (Body)"
                                value={currentItem.Body}
                                onChange={(e) => setCurrentItem(p => ({ ...p, Body: e.target.value }))}
                                fullWidth
                                multiline
                                rows={15}
                                helperText="คุณสามารถใช้โค้ด HTML ในส่วนนี้ได้"
                            />
                            <Box>
                                <Typography variant="subtitle2">ตัวแปรที่ใช้ได้ (Placeholders):</Typography>
                                {currentItem.Placeholders.split(',').map(p => (
                                    <Chip key={p} label={p.trim()} size="small" sx={{ mr: 1, mt: 1 }} />
                                ))}
                            </Box>
                        </Stack>
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

export default EmailTemplatePage;