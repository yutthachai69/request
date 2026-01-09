// frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import requestService from '../services/requestService';
import { useAuth } from '../context/AuthContext';
import RequestTable from '../components/RequestTable';
import RequestTableSkeleton from '../components/skeletons/RequestTableSkeleton';
import {
    Typography, Box, Paper, Button, Tabs, Tab, Grid, TextField,
    Collapse, Pagination, Tooltip, IconButton, Stack, Divider, Chip,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    alpha, useTheme, Card, CardContent
} from '@mui/material';
import { motion } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import { useNotification } from '../context/NotificationContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import api from '../services/api';

const formatDateForAPI = (date) => {
    if (!date) return undefined;
    return format(new Date(date), 'yyyy-MM-dd');
};

const ActiveFilters = ({ filters, onRemoveFilter, theme }) => {
    const hasActiveFilter = filters.search || filters.startDate || filters.endDate;
    if (!hasActiveFilter) return null;

    return (
        <Box 
            component={motion.div}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1.5, 
                my: 2,
                p: 2,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0.04)} 100%)`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
            }}
        >
            <Typography variant="body2" sx={{ alignSelf: 'center', mr: 1, fontWeight: 600, color: 'text.primary' }}>
                ตัวกรองที่ใช้งาน:
            </Typography>
            {filters.search && (
                <Chip 
                    label={`ค้นหา: "${filters.search}"`} 
                    onDelete={() => onRemoveFilter('search')}
                    sx={{
                        fontWeight: 500,
                        background: alpha(theme.palette.primary.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                        '&:hover': {
                            background: alpha(theme.palette.primary.main, 0.15),
                        }
                    }}
                />
            )}
            {filters.startDate && (
                <Chip 
                    label={`จาก: ${format(new Date(filters.startDate), 'dd/MM/yyyy')}`} 
                    onDelete={() => onRemoveFilter('startDate')}
                    sx={{
                        fontWeight: 500,
                        background: alpha(theme.palette.info.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                        '&:hover': {
                            background: alpha(theme.palette.info.main, 0.15),
                        }
                    }}
                />
            )}
            {filters.endDate && (
                <Chip 
                    label={`ถึง: ${format(new Date(filters.endDate), 'dd/MM/yyyy')}`} 
                    onDelete={() => onRemoveFilter('endDate')}
                    sx={{
                        fontWeight: 500,
                        background: alpha(theme.palette.info.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                        '&:hover': {
                            background: alpha(theme.palette.info.main, 0.15),
                        }
                    }}
                />
            )}
        </Box>
    );
};

const DashboardPage = () => {
    const { categoryId } = useParams();
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const { user: currentUser } = useAuth();
    const notification = useNotification();
    const [tabs, setTabs] = useState([]);
    const [pageTitle, setPageTitle] = useState('');
    const initialFilters = { search: '', startDate: null, endDate: null };
    const [filters, setFilters] = useState(initialFilters);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0, limit: 10 });
    const [showFilters, setShowFilters] = useState(true);

    // ===== START: เพิ่ม State และ Dialog สำหรับ Bulk Actions =====
    const [selected, setSelected] = useState([]);
    const [dialog, setDialog] = useState({ open: false, actionName: '', comment: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    // ===== END: เพิ่ม State และ Dialog สำหรับ Bulk Actions =====

    useEffect(() => {
        if (currentUser) {
            api.get('/admin/roles/mytabs')
                .then(res => {
                    setTabs(res.data);
                    setPageTitle(currentUser.roleName === 'Requester' ? "คำร้องของคุณ" : "Dashboard");
                })
                .catch(err => {
                    notification.showNotification('Could not load tab data', 'error');
                    setTabs([]);
                });
        }
    }, [currentUser, notification]);

    const fetchData = useCallback(() => {
        if (!categoryId || !currentUser || tabs.length === 0) {
            setLoading(false); return;
        }
        setLoading(true);
        setSelected([]); // ล้างค่าที่เลือกทุกครั้งที่ดึงข้อมูลใหม่
        const currentTab = tabs[tabValue];
        if (!currentTab) {
            setLoading(false); return;
        }

        const params = {
            categoryId,
            search: filters.search || undefined,
            startDate: formatDateForAPI(filters.startDate),
            endDate: formatDateForAPI(filters.endDate),
            page: pagination.currentPage,
            limit: pagination.limit,
            status: currentTab.StatusFilter !== 'all' ? currentTab.StatusFilter : undefined,
            approvedByMe: currentTab.IsHistory || false,
        };

        requestService.getRequests(params)
            .then(res => {
                setRequests(res.data.requests);
                setPagination(prev => ({ ...prev, currentPage: res.data.currentPage, totalPages: res.data.totalPages, totalCount: res.data.totalCount }));
            })
            .catch(err => {
                notification.showNotification('Could not load request data', 'error');
                setRequests([]);
                setPagination({ currentPage: 1, totalPages: 1, totalCount: 0, limit: 10 });
            })
            .finally(() => setLoading(false));

    }, [categoryId, tabValue, filters, currentUser, pagination.currentPage, pagination.limit, notification, tabs]);

    useEffect(() => {
        if (currentUser && tabs.length > 0) fetchData();
    }, [fetchData, currentUser, tabs]);

    const handleTabChange = (event, newValue) => {
        setFilters(initialFilters);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        setTabValue(newValue);
    };

    // ... (Filter handlers are unchanged) ...
    const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleDateChange = (name, date) => setFilters(prev => ({ ...prev, [name]: date }));
    const handleRemoveFilter = (filterKey) => {
        setFilters(prev => ({ ...prev, [filterKey]: initialFilters[filterKey] }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };
    const handleSearch = (e) => { e.preventDefault(); setPagination(prev => ({ ...prev, currentPage: 1 })); };
    const handleClearFilters = () => { setFilters(initialFilters); setPagination(prev => ({ ...prev, currentPage: 1 })); };
    const handlePageChange = (event, value) => setPagination(prev => ({ ...prev, currentPage: value }));

    const handleExport = async () => {
        setExporting(true);
        try {
            const currentTab = tabs[tabValue];
            const params = {
                categoryId,
                search: filters.search || undefined,
                startDate: formatDateForAPI(filters.startDate),
                endDate: formatDateForAPI(filters.endDate),
                status: currentTab.StatusFilter !== 'all' ? currentTab.StatusFilter : undefined,
            };

            // เรียก API ผ่าน Service
            const response = await requestService.exportRequests(params);

            // ตรรกะการดาวน์โหลดไฟล์
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `requests-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            notification.showNotification('ส่งออกไฟล์ Excel สำเร็จ', 'success');
        } catch (err) {
            notification.showNotification('เกิดข้อผิดพลาดในการส่งออกไฟล์', 'error');
        } finally {
            setExporting(false);
        }
    };

    // ===== START: เพิ่ม Handlers สำหรับ Bulk Actions =====
    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelecteds = requests.map((n) => n.RequestID);
            setSelected(newSelecteds);
            return;
        }
        setSelected([]);
    };

    const handleSelectOneClick = (event, id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }
        setSelected(newSelected);
    };

    const openBulkDialog = (action) => {
        setDialog({ open: true, actionName: action, comment: '' });
    };

    const handleBulkSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await requestService.performBulkAction({
                requestIds: selected,
                actionName: dialog.actionName,
                comment: dialog.comment
            });
            notification.showNotification(res.data.message, 'success');
            fetchData(); // Refresh data
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
        } finally {
            setIsSubmitting(false);
            setDialog({ open: false, actionName: '', comment: '' });
        }
    };
    // ===== END: เพิ่ม Handlers สำหรับ Bulk Actions =====

    if (!currentUser || tabs.length === 0) return <RequestTableSkeleton />;

    const currentTab = tabs[tabValue];
    const isPendingTab = currentTab?.StatusFilter === 'pending';

    const theme = useTheme();

    return (
        <Box>
            <Box 
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: { xs: 'flex-start', sm: 'center' }, 
                    flexDirection: { xs: 'column', sm: 'row' }, 
                    mb: 3, 
                    gap: 2 
                }}
            >
                <Typography 
                    variant="h4" 
                    sx={{ 
                        fontWeight: 800,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}
                >
                    {pageTitle}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
                    {currentUser.roleName === 'Requester' && (
                        <Button 
                            component={motion.div}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            variant="contained" 
                            startIcon={<AddIcon />} 
                            onClick={() => navigate(`/request/new?category=${categoryId}`)} 
                            fullWidth={{ xs: true, sm: false }}
                            sx={{
                                borderRadius: 2,
                                px: 3,
                                py: 1.5,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                                fontWeight: 600,
                                '&:hover': {
                                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                                }
                            }}
                        >
                            สร้างคำร้องใหม่
                        </Button>
                    )}
                    <Button 
                        component={motion.div}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        variant="outlined" 
                        startIcon={<DownloadIcon />} 
                        onClick={handleExport} 
                        disabled={exporting} 
                        fullWidth={{ xs: true, sm: false }}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            py: 1.5,
                            borderWidth: 2,
                            fontWeight: 600,
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                            '&:hover': {
                                borderWidth: 2,
                                background: alpha(theme.palette.primary.main, 0.08),
                                borderColor: theme.palette.primary.dark,
                            }
                        }}
                    >
                        {exporting ? 'กำลังส่งออก...' : 'ส่งออกเป็น Excel'}
                    </Button>
                </Box>
            </Box>

            <Paper 
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                sx={{ 
                    p: { xs: 2, md: 3 }, 
                    borderRadius: 4,
                    boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.08)}`,
                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    background: 'white'
                }}
            >
                <Box sx={{ borderBottom: `2px solid ${alpha(theme.palette.divider, 0.5)}`, mb: 2 }}>
                    <Tabs 
                        value={tabValue} 
                        onChange={handleTabChange} 
                        variant="scrollable" 
                        scrollButtons="auto" 
                        allowScrollButtonsMobile
                        sx={{
                            '& .MuiTab-root': {
                                fontWeight: 600,
                                textTransform: 'none',
                                fontSize: '0.95rem',
                                minHeight: 48,
                                '&.Mui-selected': {
                                    color: theme.palette.primary.main,
                                }
                            },
                            '& .MuiTabs-indicator': {
                                height: 3,
                                borderRadius: '3px 3px 0 0',
                            }
                        }}
                    >
                        {tabs.map(tab => <Tab key={tab.Label} label={tab.Label} />)}
                    </Tabs>
                </Box>

                {/* ... (Filter section is unchanged) ... */}

                <ActiveFilters filters={filters} onRemoveFilter={handleRemoveFilter} theme={theme} />

                {/* ===== START: เพิ่ม UI สำหรับ Bulk Actions ===== */}
                {currentUser.AllowBulkActions && isPendingTab && selected.length > 0 && (
                    <Card
                        component={motion.div}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        sx={{ 
                            p: 2.5, 
                            mb: 2, 
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                            borderRadius: 3,
                            border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.15)}`
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: theme.palette.primary.main }}>
                                {selected.length} รายการที่เลือก
                            </Typography>
                            <Stack direction="row" spacing={1.5} flexWrap="wrap">
                                <Button
                                    component={motion.div}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    variant="contained"
                                    color="success"
                                    size="medium"
                                    startIcon={<CheckCircleOutlineIcon />}
                                    onClick={() => openBulkDialog('APPROVE')}
                                    sx={{
                                        borderRadius: 2,
                                        px: 2.5,
                                        fontWeight: 600,
                                        boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
                                    }}
                                >
                                    อนุมัติ
                                </Button>
                                <Button
                                    component={motion.div}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    variant="contained"
                                    color="error"
                                    size="medium"
                                    startIcon={<DoNotDisturbIcon />}
                                    onClick={() => openBulkDialog('REJECT')}
                                    sx={{
                                        borderRadius: 2,
                                        px: 2.5,
                                        fontWeight: 600,
                                        boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
                                    }}
                                >
                                    ส่งกลับ/ปฏิเสธ
                                </Button>
                            </Stack>
                        </Stack>
                    </Card>
                )}
                {/* ===== END: เพิ่ม UI สำหรับ Bulk Actions ===== */}

                <Divider />
                <Box sx={{ mt: 3 }}>
                    {loading ? (<RequestTableSkeleton />) : (
                        <>
                            <RequestTable
                                requests={requests}
                                refreshData={fetchData}
                                statusFilter={currentTab?.StatusFilter}
                                // Props ใหม่สำหรับ Bulk Actions
                                selected={selected}
                                onSelectAllClick={handleSelectAllClick}
                                onSelectOneClick={handleSelectOneClick}
                                allowBulkActions={currentUser.AllowBulkActions && isPendingTab}
                            />
                            {pagination.totalPages > 1 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3 }}>
                                    <Pagination count={pagination.totalPages} page={pagination.currentPage} onChange={handlePageChange} color="primary" />
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </Paper>

            {/* ===== START: เพิ่ม Dialog สำหรับยืนยัน Bulk Actions ===== */}
            <Dialog 
                open={dialog.open} 
                onClose={() => setDialog({ ...dialog, open: false })}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.15)}`,
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                    }
                }}
            >
                <DialogTitle sx={{ 
                    fontWeight: 700, 
                    fontSize: '1.25rem',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 100%)`,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                }}>
                    ยืนยันการดำเนินการ
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <DialogContentText sx={{ mb: 2, fontSize: '1rem', fontWeight: 500 }}>
                        คุณต้องการ <strong>{dialog.actionName === 'APPROVE' ? 'อนุมัติ' : 'ปฏิเสธ'}</strong> ทั้งหมด <strong>{selected.length}</strong> รายการใช่หรือไม่?
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="หมายเหตุ (ถ้ามี)"
                        fullWidth
                        variant="outlined"
                        value={dialog.comment}
                        onChange={(e) => setDialog({ ...dialog, comment: e.target.value })}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            }
                        }}
                        multiline
                        rows={3}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                    <Button 
                        onClick={() => setDialog({ ...dialog, open: false })}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            fontWeight: 600,
                            textTransform: 'none'
                        }}
                    >
                        ยกเลิก
                    </Button>
                    <Button 
                        onClick={handleBulkSubmit} 
                        disabled={isSubmitting} 
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            fontWeight: 600,
                            textTransform: 'none',
                            background: dialog.actionName === 'APPROVE' 
                                ? `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
                                : `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                            boxShadow: `0 4px 12px ${alpha(dialog.actionName === 'APPROVE' ? theme.palette.success.main : theme.palette.error.main, 0.3)}`,
                            '&:hover': {
                                boxShadow: `0 6px 16px ${alpha(dialog.actionName === 'APPROVE' ? theme.palette.success.main : theme.palette.error.main, 0.4)}`,
                            }
                        }}
                    >
                        {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* ===== END: เพิ่ม Dialog สำหรับยืนยัน Bulk Actions ===== */}
        </Box>
    );
};

export default DashboardPage;