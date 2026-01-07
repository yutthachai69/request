// frontend/src/pages/admin/DocConfigPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, TextField, Button, CircularProgress,
    Stack, Grid, MenuItem, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, Tooltip
} from '@mui/material';
import { motion } from 'framer-motion';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

const DocConfigPage = () => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [allCategories, setAllCategories] = useState([]);
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);
    const notification = useNotification();
    const [editingRowId, setEditingRowId] = useState(null);
    const [editFormData, setEditFormData] = useState({ prefix: '', lastRunningNumber: 0 });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [configsRes, categoriesRes] = await Promise.all([
                adminService.getDocConfigs(),
                adminService.getCategories()
            ]);
            
            setAllCategories(categoriesRes.data);

            const yearConfigs = configsRes.data.filter(c => c.Year === selectedYear);
            const configsMap = {};
            categoriesRes.data.forEach(cat => {
                const existingConfig = yearConfigs.find(c => c.CategoryID === cat.CategoryID);
                configsMap[cat.CategoryID] = {
                    prefix: existingConfig?.Prefix || '',
                    lastRunningNumber: existingConfig?.LastRunningNumber || 0,
                    configId: existingConfig?.ConfigID || null,
                };
            });
            setConfigs(configsMap);

        } catch (error) {
            notification.showNotification('ไม่สามารถโหลดข้อมูลได้', 'error');
        } finally {
            setLoading(false);
        }
    }, [selectedYear, notification]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleEditClick = (category) => {
        setEditingRowId(category.CategoryID);
        setEditFormData({
            prefix: configs[category.CategoryID]?.prefix || '',
            lastRunningNumber: configs[category.CategoryID]?.lastRunningNumber || 0
        });
    };

    const handleCancelClick = () => {
        setEditingRowId(null);
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveClick = async (categoryId) => {
        const config = configs[categoryId];
        const dataToSave = {
            categoryId: categoryId,
            year: selectedYear,
            prefix: editFormData.prefix,
            lastRunningNumber: parseInt(editFormData.lastRunningNumber, 10) || 0,
            configId: config.configId
        };

        try {
            await adminService.saveDocConfig(dataToSave);
            notification.showNotification('บันทึกข้อมูลสำเร็จ!', 'success');
            setEditingRowId(null);
            loadData();
        } catch (error) {
            notification.showNotification('เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
    };

    const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i);

    return (
        <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: 'grey.50' }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>ตั้งค่าเลขที่เอกสาร</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                เลือกปีที่ต้องการตั้งค่า จากนั้นกดปุ่ม "แก้ไข" ในแถวที่ต้องการเพื่อกำหนด Prefix และเลขเริ่มต้น
            </Typography>

            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4} md={3}>
                    <TextField
                        select
                        label="เลือกปี"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                        fullWidth
                        disabled={!!editingRowId}
                        size="small"
                    >
                        {yearOptions.map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                    </TextField>
                </Grid>
            </Grid>

            {loading ? <CircularProgress /> : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>หมวดหมู่</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Prefix</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>เลขล่าสุด (Last Running)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>เครื่องมือ</TableCell>
                            </TableRow>
                        </TableHead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                           {allCategories.map(category => (
                                <motion.tr component={TableRow} hover key={category.CategoryID} variants={itemVariants}>
                                    <TableCell sx={{fontWeight: 500}}>{category.CategoryName}</TableCell>
                                    <TableCell>
                                        {editingRowId === category.CategoryID ? (
                                            <TextField
                                                name="prefix"
                                                value={editFormData.prefix}
                                                onChange={handleEditFormChange}
                                                variant="outlined"
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body2" color={configs[category.CategoryID]?.prefix ? 'text.primary' : 'text.secondary'}>
                                                {configs[category.CategoryID]?.prefix || <em>(ยังไม่ตั้งค่า)</em>}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                         {editingRowId === category.CategoryID ? (
                                            <TextField
                                                name="lastRunningNumber"
                                                type="number"
                                                value={editFormData.lastRunningNumber}
                                                onChange={handleEditFormChange}
                                                variant="outlined"
                                                size="small"
                                                sx={{maxWidth: 120}}
                                                inputProps={{ min: 0 }}
                                            />
                                        ) : (
                                            <Typography variant="body1">{configs[category.CategoryID]?.lastRunningNumber || 0}</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        {editingRowId === category.CategoryID ? (
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                <Tooltip title="บันทึก">
                                                    <IconButton size="small" color="primary" onClick={() => handleSaveClick(category.CategoryID)}>
                                                        <SaveIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="ยกเลิก">
                                                    <IconButton size="small" color="error" onClick={handleCancelClick}>
                                                        <CancelIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        ) : (
                                            <Tooltip title="แก้ไข">
                                                <IconButton size="small" onClick={() => handleEditClick(category)} disabled={!!editingRowId}>
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </motion.tr>
                           ))}
                        </motion.tbody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};

export default DocConfigPage;