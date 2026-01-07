// frontend/src/pages/admin/MasterDataPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, TextField, Dialog, DialogActions,
    DialogContent, DialogTitle, Tooltip, CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

const MasterDataPage = ({ title, fetchItems, createItem, updateItem, deleteItem, itemNameField, itemIdField }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [name, setName] = useState('');

    const loadItems = React.useCallback(() => {
        setLoading(true);
        fetchItems()
            .then(res => setItems(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [fetchItems]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const handleOpen = (item = null) => {
        setCurrentItem(item);
        setName(item ? item[itemNameField] : '');
        setOpen(true);
    };
    const handleClose = () => setOpen(false);

    const handleSave = () => {
        const payload = { [itemNameField]: name };
        const action = currentItem 
            ? updateItem(currentItem[itemIdField], payload) 
            : createItem(payload);
        
        action.then(() => {
            loadItems();
            handleClose();
        }).catch(err => alert(`เกิดข้อผิดพลาด: ${err.response?.data?.message || err.message}`));
    };
    
    const handleDelete = (id) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
            deleteItem(id).then(loadItems).catch(err => alert(`เกิดข้อผิดพลาด: ${err.response?.data?.message || err.message}`));
        }
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: 'grey.50' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{title}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: '12px', px: 3 }}>
                    เพิ่มใหม่
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
                                <TableCell sx={{ fontWeight: 'bold' }}>ชื่อ</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>เครื่องมือ</TableCell>
                            </TableRow>
                        </TableHead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                            {items.map(item => (
                                <motion.tr component={TableRow} hover key={item[itemIdField]} variants={itemVariants}>
                                    <TableCell>{item[itemIdField]}</TableCell>
                                    <TableCell>{item[itemNameField]}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="แก้ไข">
                                            <IconButton size="small" onClick={() => handleOpen(item)}><EditIcon fontSize="inherit" /></IconButton>
                                        </Tooltip>
                                        <Tooltip title="ลบ">
                                            <IconButton size="small" onClick={() => handleDelete(item[itemIdField])}><DeleteIcon fontSize="inherit" /></IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </motion.tbody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{currentItem ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</DialogTitle>
                <DialogContent>
                    <TextField 
                        autoFocus 
                        margin="dense" 
                        label="ชื่อ" 
                        fullWidth 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        sx={{mt: 1}}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>ยกเลิก</Button>
                    <Button onClick={handleSave} variant="contained">บันทึก</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};
export default MasterDataPage;