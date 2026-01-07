// frontend/src/pages/admin/CorrectionTypePage.jsx
import React, { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, Tooltip, Chip, Switch,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, Stack, Divider, FormControlLabel,
    CircularProgress, DialogContentText,
    FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput,
    Pagination
} from '@mui/material';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import { motion } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

const CorrectionTypePage = () => {
    const [types, setTypes] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
    const notification = useNotification();

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const loadData = React.useCallback(() => {
        setLoading(true);
        Promise.all([
            adminService.getCorrectionTypesAdmin({ page: pagination.currentPage, limit: 10 }),
            adminService.getCategories()
        ]).then(([typesRes, categoriesRes]) => {
            setTypes(typesRes.data.types);
            setPagination(prev => ({ ...prev, totalPages: typesRes.data.totalPages }));
            setAllCategories(categoriesRes.data);
        }).catch(err => {
            notification.showNotification('ไม่สามารถโหลดข้อมูลได้', 'error');
        }).finally(() => {
            setLoading(false);
        });
    }, [notification, pagination.currentPage]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handlePageChange = (event, value) => {
        setPagination(prev => ({ ...prev, currentPage: value }));
    };

    const handleOpen = async (item = null) => {
        let fields = [];
        let mappedCategoryIds = [];

        if (item) {
            if (item.FieldsConfig) {
                try {
                    fields = JSON.parse(item.FieldsConfig).map(f => ({ ...f, type: f.type || 'text', required: !!f.required }));
                } catch (e) { console.error("Failed to parse FieldsConfig", e); }
            }
            try {
                const mappingRes = await adminService.getCategoryMappingsForType(item.CorrectionTypeID);
                mappedCategoryIds = mappingRes.data;
            } catch (e) {
                notification.showNotification('ไม่สามารถโหลดข้อมูลหมวดหมู่ที่เชื่อมโยงได้', 'error');
            }
        }

        setCurrentItem({
            ...item,
            CorrectionTypeName: item?.CorrectionTypeName || '',
            Priority: item?.Priority || 99,
            TemplateString: item?.TemplateString || '',
            IsActive: item ? !!item.IsActive : true,
            FieldsConfig: fields,
            RequiredRoleLevel: item?.RequiredRoleLevel || '',
            categoryIds: mappedCategoryIds
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentItem(null);
    };

    const handleSave = async () => {
        if (!currentItem || !currentItem.CorrectionTypeName) {
            notification.showNotification('กรุณากรอกชื่อประเภท', 'warning');
            return;
        }
        
        const dataToSave = {
            name: currentItem.CorrectionTypeName,
            priority: parseInt(currentItem.Priority, 10) || 99,
            isActive: currentItem.IsActive,
            templateString: currentItem.TemplateString,
            fieldsConfig: JSON.stringify(currentItem.FieldsConfig || []),
            requiredRoleLevel: currentItem.RequiredRoleLevel ? parseFloat(currentItem.RequiredRoleLevel) : null,
            categoryIds: currentItem.categoryIds || []
        };

        try {
            if (currentItem.CorrectionTypeID) {
                await adminService.updateCorrectionType(currentItem.CorrectionTypeID, dataToSave);
                notification.showNotification('อัปเดตประเภทสำเร็จ', 'success');
            } else {
                await adminService.createCorrectionType(dataToSave);
                notification.showNotification('สร้างประเภทใหม่สำเร็จ', 'success');
            }
            loadData();
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
            await adminService.deleteCorrectionType(itemToDelete.CorrectionTypeID);
            notification.showNotification(`ลบ "${itemToDelete.CorrectionTypeName}" สำเร็จ`, 'success');
            loadData();
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
        } finally {
            handleCloseConfirm();
        }
    };

    const handleFieldChange = (index, fieldName, value) => {
        const updatedFields = [...currentItem.FieldsConfig];
        updatedFields[index] = { ...updatedFields[index], [fieldName]: value };
        setCurrentItem(prev => ({ ...prev, FieldsConfig: updatedFields }));
    };

    const addField = () => {
        const newFields = [...(currentItem.FieldsConfig || []), { label: '', type: 'text', required: false }];
        setCurrentItem(prev => ({ ...prev, FieldsConfig: newFields }));
    };

    const removeField = (index) => {
        const updatedFields = currentItem.FieldsConfig.filter((_, i) => i !== index);
        setCurrentItem(prev => ({ ...prev, FieldsConfig: updatedFields }));
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: 'grey.50' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>จัดการประเภทการแก้ไข</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: '12px', px: 3 }}>
                    สร้างประเภทใหม่
                </Button>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ชื่อ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ใช้งานในหมวดหมู่</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>ลำดับความสำคัญ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>สถานะ</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>เครื่องมือ</TableCell>
                                </TableRow>
                            </TableHead>
                            <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                                {types.map(type => (
                                    <motion.tr component={TableRow} hover key={type.CorrectionTypeID} variants={itemVariants}>
                                        <TableCell sx={{fontWeight: 500}}>{type.CorrectionTypeName}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {type.UsedInCategories ? type.UsedInCategories.split(', ').map(catName => (
                                                    <Chip key={catName} label={catName} size="small" />
                                                )) : (
                                                    <Typography variant="caption" color="text.secondary">-</Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'center' }}>
                                            <Chip label={type.Priority} size="small" />
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'center' }}>
                                            <Chip label={type.IsActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} color={type.IsActive ? 'success' : 'default'} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="แก้ไข">
                                                <IconButton size="small" onClick={() => handleOpen(type)}><EditIcon fontSize="inherit" /></IconButton>
                                            </Tooltip>
                                            <Tooltip title="ลบ">
                                                <IconButton size="small" onClick={() => handleOpenConfirm(type)} color="error"><DeleteIcon fontSize="inherit" /></IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </motion.tbody>
                        </Table>
                    </TableContainer>

                    {pagination.totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3 }}>
                            <Pagination 
                                count={pagination.totalPages} 
                                page={pagination.currentPage} 
                                onChange={handlePageChange} 
                                color="primary" 
                            />
                        </Box>
                    )}
                </>
            )}

            {currentItem && (
                <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
                    <DialogTitle>{currentItem.CorrectionTypeID ? 'แก้ไข' : 'สร้าง'}ประเภทการแก้ไข</DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ pt: 1 }}>
                            <TextField
                                label="ชื่อประเภท"
                                value={currentItem.CorrectionTypeName}
                                onChange={(e) => setCurrentItem(prev => ({ ...prev, CorrectionTypeName: e.target.value }))}
                                fullWidth
                                required
                            />
                             <FormControl fullWidth>
                                <InputLabel>ใช้งานในหมวดหมู่</InputLabel>
                                <Select
                                    multiple
                                    value={currentItem.categoryIds}
                                    onChange={(e) => setCurrentItem(prev => ({...prev, categoryIds: e.target.value}))}
                                    input={<OutlinedInput label="ใช้งานในหมวดหมู่" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((value) => (
                                                <Chip key={value} label={allCategories.find(c => c.CategoryID === value)?.CategoryName} />
                                            ))}
                                        </Box>
                                    )}
                                >
                                    {allCategories.map((category) => (
                                        <MenuItem key={category.CategoryID} value={category.CategoryID}>
                                            <Checkbox checked={currentItem.categoryIds.indexOf(category.CategoryID) > -1} />
                                            <ListItemText primary={category.CategoryName} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                label="ลำดับความสำคัญ (Priority)"
                                type="number"
                                value={currentItem.Priority}
                                onChange={(e) => setCurrentItem(prev => ({ ...prev, Priority: e.target.value }))}
                                fullWidth
                                helperText="ยิ่งเลขน้อย ยิ่งสำคัญมาก (เช่น 1 สำคัญกว่า 99)"
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
                            
                            <Divider>ตั้งค่าฟอร์มแบบไดนามิก</Divider>

                            <Box>
                                <Typography gutterBottom variant="subtitle1">ช่องกรอกข้อมูล</Typography>
                                <Stack spacing={2}>
                                    {currentItem.FieldsConfig?.map((field, index) => (
                                        <Stack direction="row" spacing={2} key={index} alignItems="center">
                                            <TextField
                                                label={`Label ช่องที่ ${index + 1}`}
                                                value={field.label}
                                                onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                                                fullWidth
                                                size="small"
                                            />
                                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                                <InputLabel>ประเภทช่อง</InputLabel>
                                                <Select
                                                    value={field.type || 'text'}
                                                    label="ประเภทช่อง"
                                                    onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                                                >
                                                    <MenuItem value="text">Text Field</MenuItem>
                                                    <MenuItem value="textarea">Text Area</MenuItem>
                                                </Select>
                                            </FormControl>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={!!field.required}
                                                        onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                                                    />
                                                }
                                                label="บังคับกรอก"
                                                sx={{ minWidth: 120 }}
                                            />
                                            <Tooltip title="ลบช่องข้อมูล">
                                                <IconButton onClick={() => removeField(index)}><DeleteIcon color="error"/></IconButton>
                                            </Tooltip>
                                        </Stack>
                                    ))}
                                </Stack>
                                <Button startIcon={<AddCircleOutlineIcon />} onClick={addField} sx={{ mt: 2 }}>
                                    เพิ่มช่องข้อมูล
                                </Button>
                            </Box>
                            
                            <TextField
                                label="Template ข้อความ"
                                multiline
                                rows={4}
                                value={currentItem.TemplateString}
                                onChange={(e) => setCurrentItem(prev => ({ ...prev, TemplateString: e.target.value }))}
                                fullWidth
                                helperText="ใช้ {val1}, {val2}, ... แทนค่าจากช่องข้อมูลด้านบนตามลำดับ"
                            />
                        </Stack>
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
                            คุณต้องการลบประเภทการแก้ไข "{itemToDelete.CorrectionTypeName}" จริงหรือไม่?
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
export default CorrectionTypePage;