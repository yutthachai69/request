// frontend/src/pages/admin/AuditLogPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, TextField, IconButton,
    Tooltip, Grid, Pagination, Button, Stack, Collapse, Chip, MenuItem,
    FormControl, InputLabel, Select, Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import { motion } from 'framer-motion';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import { format } from 'date-fns';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

const formatDateForAPI = (date) => {
    if (!date) return null;
    try {
        return format(new Date(date), 'yyyy-MM-dd');
    } catch (e) {
        return null;
    }
};

const AuditLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0 });
    const [filters, setFilters] = useState({ search: '', userId: '', action: '', startDate: null, endDate: null });
    const [showFilters, setShowFilters] = useState(true);
    const [users, setUsers] = useState([]);
    const [actionTypes, setActionTypes] = useState([]);
    const notification = useNotification();

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminService.getAuditLogs({
                page: pagination.currentPage,
                limit: 20,
                search: filters.search,
                userId: filters.userId || undefined,
                action: filters.action || undefined,
                startDate: formatDateForAPI(filters.startDate),
                endDate: formatDateForAPI(filters.endDate)
            });
            
            // ✅ ป้องกันค่า undefined
            const logData = res.data?.logs || [];
            setLogs(Array.isArray(logData) ? logData : []);
            
            // ✅ ตั้งค่า Pagination ให้ปลอดภัย
            setPagination({
                currentPage: res.data?.currentPage || 1,
                totalPages: res.data?.totalPages || 1,
                totalCount: res.data?.totalCount || 0
            });
        } catch (error) {
            notification.showNotification('ไม่สามารถโหลดข้อมูล Audit Log ได้', 'error');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [pagination.currentPage, filters, notification]);

    const fetchMasterData = useCallback(async () => {
        try {
            const [usersRes, actionsRes] = await Promise.all([
                adminService.getUsers(),
                adminService.getAuditLogActions()
            ]);

            // ✅ ตรวจสอบโครงสร้างข้อมูลอย่างละเอียด
            const userData = usersRes.data?.users || usersRes.data || [];
            setUsers(Array.isArray(userData) ? userData : []);

            const actionData = actionsRes.data?.actions || actionsRes.data || [];
            setActionTypes(Array.isArray(actionData) ? actionData : []);
        } catch (error) {
            console.error("Master Data Error:", error);
            notification.showNotification('ไม่สามารถโหลดข้อมูลสำหรับ Filter ได้', 'error');
        }
    }, [notification]);

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (name, date) => {
        setFilters(prev => ({ ...prev, [name]: date }));
    };

    const handleClearFilters = () => {
        setFilters({ search: '', userId: '', action: '', startDate: null, endDate: null });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handlePageChange = (event, value) => {
        setPagination(prev => ({ ...prev, currentPage: value }));
    };

    const getActionColor = (action) => {
        if (!action) return 'info';
        if (action.includes('LOGIN_FAILED')) return 'error';
        if (action.includes('LOGIN')) return 'success';
        if (action.includes('PASSWORD_CHANGED')) return 'warning';
        return 'info';
    };

    const ActiveFilters = () => {
        const hasActiveFilter = filters.search || filters.userId || filters.action || filters.startDate || filters.endDate;
        if (!hasActiveFilter) return null;

        return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
                <Typography variant="body2" sx={{ alignSelf: 'center', mr: 1 }}>ตัวกรองที่ใช้งาน:</Typography>
                {filters.search && (<Chip label={`ค้นหา: "${filters.search}"`} onDelete={() => setFilters(prev => ({ ...prev, search: '' }))} />)}
                {filters.userId && (<Chip label={`ผู้ใช้: ${Array.isArray(users) ? (users.find(u => u.UserID === filters.userId)?.FullName || 'N/A') : 'N/A'}`} onDelete={() => setFilters(prev => ({ ...prev, userId: '' }))} />)}
                {filters.action && (<Chip label={`กิจกรรม: ${filters.action}`} onDelete={() => setFilters(prev => ({ ...prev, action: '' }))} />)}
                {filters.startDate && (<Chip label={`จาก: ${format(new Date(filters.startDate), 'dd/MM/yyyy')}`} onDelete={() => setFilters(prev => ({ ...prev, startDate: null }))} />)}
                {filters.endDate && (<Chip label={`ถึง: ${format(new Date(filters.endDate), 'dd/MM/yyyy')}`} onDelete={() => setFilters(prev => ({ ...prev, endDate: null }))} />)}
            </Box>
        );
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>ประวัติการใช้งาน (Audit Log)</Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>ตัวกรอง</Typography>
                    <Button size="small" startIcon={<FilterListIcon />} onClick={() => setShowFilters(!showFilters)} sx={{ color: 'text.secondary' }}>
                        {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
                    </Button>
                </Box>
                <Collapse in={showFilters}>
                    <Divider sx={{ my: 2 }} />
                    <Box component="form" onSubmit={handleSearch}>
                        <Grid container spacing={2}>
                            {/* ✅ ลบ item prop ออกจากทุุก Grid */}
                            <Grid xs={12} md={6}>
                                <TextField name="search" label="ค้นหา (ชื่อ, กิจกรรม, รายละเอียด, IP)" value={filters.search} onChange={handleFilterChange} fullWidth size="small" />
                            </Grid>
                            <Grid xs={12} md={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>กิจกรรม</InputLabel>
                                    <Select name="action" label="กิจกรรม" value={filters.action} onChange={handleFilterChange}>
                                        <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
                                        {Array.isArray(actionTypes) && actionTypes.map(action => (
                                            <MenuItem key={action} value={action}>{action}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid xs={12} md={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>ผู้ใช้งาน</InputLabel>
                                    <Select name="userId" label="ผู้ใช้งาน" value={filters.userId} onChange={handleFilterChange}>
                                        <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
                                        {/* ✅ เพิ่ม Array.isArray ป้องกัน error แดง */}
                                        {Array.isArray(users) && users.map(user => (
                                            <MenuItem key={user.UserID} value={user.UserID}>{user.FullName}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid xs={12} sm={6} md={3}>
                                <DatePicker label="วันที่เริ่มต้น" value={filters.startDate} onChange={(date) => handleDateChange('startDate', date)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
                            </Grid>
                            <Grid xs={12} sm={6} md={3}>
                                <DatePicker label="วันที่สิ้นสุด" value={filters.endDate} onChange={(date) => handleDateChange('endDate', date)} minDate={filters.startDate} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
                            </Grid>
                            <Grid xs={12}>
                                <Stack direction="row" spacing={1} sx={{ height: '100%' }}>
                                    <Button type="submit" variant="contained" startIcon={<SearchIcon />} fullWidth>ค้นหา</Button>
                                    <Tooltip title="ล้างค่าการกรอง">
                                        <IconButton onClick={handleClearFilters}><ClearIcon /></IconButton>
                                    </Tooltip>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Box>
                </Collapse>
            </Box>

            <ActiveFilters />

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>ผู้ใช้งาน</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>กิจกรรม</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>IP Address</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>รายละเอียด</TableCell>
                            </TableRow>
                        </TableHead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                            {logs.map(log => (
                                <motion.tr component={TableRow} hover key={log.LogID} variants={itemVariants}>
                                    <TableCell>{log.Timestamp ? new Date(log.Timestamp).toLocaleString('th-TH') : '-'}</TableCell>
                                    <TableCell>{log.FullName || 'Guest'}</TableCell>
                                    <TableCell>
                                        <Chip label={log.Action} color={getActionColor(log.Action)} size="small" />
                                    </TableCell>
                                    <TableCell>{log.IPAddress}</TableCell>
                                    <TableCell sx={{ maxWidth: 300, whiteSpace: 'normal', wordBreak: 'break-all' }}>
                                        {log.Detail}
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </motion.tbody>
                    </Table>
                </TableContainer>
            )}

            {pagination.totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3 }}>
                    <Pagination count={pagination.totalPages} page={pagination.currentPage} onChange={handlePageChange} color="primary" />
                </Box>
            )}
        </Paper>
    );
};

export default AuditLogPage;