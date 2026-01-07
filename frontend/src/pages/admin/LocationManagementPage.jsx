// frontend/src/pages/admin/LocationManagementPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, Tooltip, Chip, 
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, CircularProgress, Stack,
    FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput
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

const LocationManagementPage = () => {
    const [locations, setLocations] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const notification = useNotification();

    const loadData = React.useCallback(() => {
        setLoading(true);
        Promise.all([
            adminService.getLocationsAdmin(),
            adminService.getCategories()
        ]).then(async ([locationsRes, categoriesRes]) => {
            const locationsWithMappings = await Promise.all(
                locationsRes.data.map(async (loc) => {
                    const mappingsRes = await adminService.getCategoryMappingsForLocation(loc.LocationID);
                    const categoryNames = mappingsRes.data
                        .map(catId => categoriesRes.data.find(c => c.CategoryID === catId)?.CategoryName)
                        .filter(Boolean)
                        .join(', ');
                    return { ...loc, UsedInCategories: categoryNames };
                })
            );
            setLocations(locationsWithMappings);
            setAllCategories(categoriesRes.data);
        }).catch(err => {
            notification.showNotification('ไม่สามารถโหลดข้อมูลได้', 'error');
        }).finally(() => {
            setLoading(false);
        });
    }, [notification]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpen = async (item = null) => {
        let mappedCategoryIds = [];
        if (item) {
            try {
                const mappingRes = await adminService.getCategoryMappingsForLocation(item.LocationID);
                mappedCategoryIds = mappingRes.data;
            } catch (e) {
                notification.showNotification('ไม่สามารถโหลดข้อมูลหมวดหมู่ที่เชื่อมโยงได้', 'error');
            }
        }
        setCurrentItem({
            LocationID: item?.LocationID || null,
            LocationName: item?.LocationName || '',
            categoryIds: mappedCategoryIds
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentItem(null);
    };

    const handleSave = async () => {
        if (!currentItem || !currentItem.LocationName.trim()) {
            notification.showNotification('กรุณากรอกชื่อสถานที่', 'warning');
            return;
        }
        const payload = { 
            LocationName: currentItem.LocationName,
            categoryIds: currentItem.categoryIds
        };
        
        try {
            if (currentItem.LocationID) {
                await adminService.updateLocation(currentItem.LocationID, payload);
                notification.showNotification('อัปเดตข้อมูลสำเร็จ', 'success');
            } else {
                await adminService.createLocation(payload);
                notification.showNotification('สร้างสถานที่ใหม่สำเร็จ', 'success');
            }
            loadData();
            handleClose();
        } catch(err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
        }
    };
    
    const handleDelete = (id) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การกระทำนี้จะลบความสัมพันธ์กับหมวดหมู่ทั้งหมดด้วย')) {
            adminService.deleteLocation(id)
                .then(() => {
                    notification.showNotification('ลบสถานที่สำเร็จ', 'success');
                    loadData();
                })
                .catch(err => notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error'));
        }
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: 'grey.50' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>จัดการสถานที่</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: '12px', px: 3 }}>
                    เพิ่มใหม่
                </Button>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>ชื่อสถานที่</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>ใช้งานในหมวดหมู่</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>เครื่องมือ</TableCell>
                            </TableRow>
                        </TableHead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                            {locations.map(item => (
                                <motion.tr component={TableRow} hover key={item.LocationID} variants={itemVariants}>
                                    <TableCell>{item.LocationID}</TableCell>
                                    <TableCell>{item.LocationName}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {item.UsedInCategories ? item.UsedInCategories.split(', ').map(catName => (
                                                <Chip key={catName} label={catName} size="small" />
                                            )) : (
                                                <Typography variant="caption" color="text.secondary">-</Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="แก้ไข"><IconButton size="small" onClick={() => handleOpen(item)}><EditIcon fontSize="inherit" /></IconButton></Tooltip>
                                        <Tooltip title="ลบ"><IconButton size="small" onClick={() => handleDelete(item.LocationID)}><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </motion.tbody>
                    </Table>
                </TableContainer>
            )}

            {currentItem && (
                <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                    <DialogTitle>{currentItem.LocationID ? 'แก้ไข' : 'สร้าง'}สถานที่</DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ pt: 1 }}>
                            <TextField 
                                autoFocus 
                                margin="dense" 
                                label="ชื่อสถานที่" 
                                fullWidth 
                                value={currentItem.LocationName} 
                                onChange={e => setCurrentItem(prev => ({ ...prev, LocationName: e.target.value }))}
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
export default LocationManagementPage;