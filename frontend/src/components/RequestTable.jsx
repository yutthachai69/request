// frontend/src/components/RequestTable.jsx
import React from 'react';
import {
    Paper, Typography, Chip, Box, IconButton, Tooltip, Stack, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    useMediaQuery, Avatar, Checkbox
} from '@mui/material';
import { blue } from '@mui/material/colors';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'; // เพิ่ม Icon
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requestService from '../services/requestService';
import { motion } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useStatuses } from '../context/StatusContext';

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

const RequestTable = ({ 
    requests, 
    refreshData, 
    statusFilter,
    selected,
    onSelectAllClick,
    onSelectOneClick,
    allowBulkActions
}) => {
    const navigate = useNavigate();
    const theme = useTheme();
    const { user: currentUser } = useAuth();
    const notification = useNotification();
    const { statuses } = useStatuses();

    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    const getStatusInfo = (statusCode) => {
        return statuses.find(s => s.StatusCode === statusCode);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (window.confirm('คุณต้องการลบคำร้องนี้ใช่หรือไม่?')) {
            requestService.deleteRequest(id)
                .then(() => {
                    notification.showNotification('ลบคำร้องสำเร็จ', 'success');
                    if (refreshData) refreshData();
                })
                .catch(err => {
                    const message = err.response?.data?.message || 'Server error';
                    notification.showNotification(`เกิดข้อผิดพลาดในการลบ: ${message}`, 'error');
                });
        }
    };

    const handleNavigateToDetail = (id) => {
        navigate(`/request/${id}`);
    };

    const handleNavigateToEdit = (e, id) => {
        e.stopPropagation();
        navigate(`/request/edit/${id}`);
    }

    if (!requests || requests.length === 0) {
        return (
            <Box sx={{ mt: 3, p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'grey.400', borderRadius: 2 }}>
                <Typography color="text.secondary">ไม่พบข้อมูลคำร้องที่ตรงกับเงื่อนไข</Typography>
            </Box>
        );
    }

    const renderStatusChip = (statusCode, statusName) => {
        const statusInfo = getStatusInfo(statusCode);
        return (
            <Chip 
                label={statusName} 
                size="small"
                sx={{
                    backgroundColor: statusInfo?.ColorCode || '#e0e0e0',
                    color: theme.palette.getContrastText(statusInfo?.ColorCode || '#e0e0e0'),
                    fontWeight: 500,
                }}
            />
        );
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;

    const DesktopView = () => (
        <TableContainer component={Paper} variant="outlined">
            <Table sx={{ minWidth: 650 }}>
                <TableHead>
                    <TableRow>
                        {allowBulkActions && (
                            <TableCell padding="checkbox">
                                <Checkbox
                                    color="primary"
                                    indeterminate={selected.length > 0 && selected.length < requests.length}
                                    checked={requests.length > 0 && selected.length === requests.length}
                                    onChange={onSelectAllClick}
                                    inputProps={{ 'aria-label': 'select all requests' }}
                                />
                            </TableCell>
                        )}
                        <TableCell sx={{ fontWeight: 'bold' }}>เลขที่เอกสาร</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>รายละเอียด</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>ชื่อผู้ขอ</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>วันที่</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>สถานะปัจจุบัน</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {requests.map((row, index) => { 
                         const canBeEdited = ['PENDING_HOD', 'REVISION_REQUIRED'].includes(row.CurrentStatus);
                         const canEditOrDelete = currentUser.roleName === 'Requester' && row.RequesterID === currentUser.id && canBeEdited;
                         const isItemSelected = isSelected(row.RequestID);

                         const isCompletedTab = statusFilter === 'PROCESSED,COMPLETED';
                         const dateToShow = isCompletedTab && row.IT_CompletedAt 
                             ? row.IT_CompletedAt 
                             : (row.ApprovalTimestamp || row.RequestDate);

                        return (
                            <TableRow
                                component={motion.tr}
                                whileHover={{ backgroundColor: theme.palette.action.hover }}
                                key={`desktop-row-${row.RequestID}-${row.ApprovalID || index}`} 
                                sx={{ cursor: 'pointer' }} 
                                role="checkbox"
                                aria-checked={isItemSelected}
                                tabIndex={-1}
                                selected={isItemSelected}
                            >
                                {allowBulkActions && (
                                    <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                                        <Checkbox
                                            color="primary"
                                            checked={isItemSelected}
                                            onChange={(event) => onSelectOneClick(event, row.RequestID)}
                                            inputProps={{ 'aria-labelledby': `request-table-checkbox-${index}` }}
                                        />
                                    </TableCell>
                                )}
                                <TableCell onClick={() => handleNavigateToDetail(row.RequestID)}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.RequestNumber || `#${row.RequestID}`}</Typography>
                                </TableCell>
                                <TableCell sx={{ maxWidth: 350 }} onClick={() => handleNavigateToDetail(row.RequestID)}>
                                    <Tooltip title={row.ProblemDetail || '-'}>
                                        <Typography variant="body2" color="text.secondary" noWrap sx={{ textOverflow: 'ellipsis' }}>
                                            {row.ProblemDetail || '-'}
                                        </Typography>
                                    </Tooltip>
                                </TableCell>
                                <TableCell onClick={() => handleNavigateToDetail(row.RequestID)}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar sx={{ bgcolor: blue[100], color: blue[600], width: 32, height: 32, fontSize: '0.875rem' }}>
                                            {row.RequesterName ? row.RequesterName.charAt(0) : '?'}
                                        </Avatar>
                                        <Typography variant="body2">{row.RequesterName}</Typography>
                                    </Stack>
                                </TableCell>
                                <TableCell onClick={() => handleNavigateToDetail(row.RequestID)}>{new Date(dateToShow).toLocaleDateString('th-TH')}</TableCell>
                                <TableCell onClick={() => handleNavigateToDetail(row.RequestID)}>
                                    {/* ===== START: แก้ไขส่วนนี้ ===== */}
                                    <Stack spacing={0.5} alignItems="flex-start">
                                        {renderStatusChip(row.CurrentStatus, row.StatusName)}
                                        {row.NextApprovers && row.NextApprovers.length > 0 && (
                                            <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                                                ⏳ รอ: {row.NextApprovers.join(', ')}
                                            </Typography>
                                        )}
                                    </Stack>
                                    {/* ===== END: แก้ไขส่วนนี้ ===== */}
                                </TableCell>
                                <TableCell align="center" onClick={e => e.stopPropagation()}>
                                    {/* ===== START: แก้ไขส่วนนี้ ===== */}
                                    {row.LatestComment && (
                                        <Tooltip title={`${row.LatestCommentBy}: "${row.LatestComment}"`}>
                                            <IconButton size="small" sx={{ color: 'text.secondary' }}>
                                                <ChatBubbleOutlineIcon fontSize="inherit" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {/* ===== END: แก้ไขส่วนนี้ ===== */}
                                    <Tooltip title="ดูรายละเอียด">
                                        <IconButton size="small" onClick={() => handleNavigateToDetail(row.RequestID)}>
                                            <VisibilityIcon fontSize="inherit" />
                                        </IconButton>
                                    </Tooltip>
                                    {canEditOrDelete && (
                                        <>
                                            <Tooltip title="แก้ไข"><IconButton size="small" onClick={(e) => handleNavigateToEdit(e, row.RequestID)}><EditIcon fontSize="inherit" /></IconButton></Tooltip>
                                            <Tooltip title="ลบ"><IconButton size="small" onClick={(e) => handleDelete(e, row.RequestID)}><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const MobileView = () => (
        <Stack spacing={2}>
            {requests.map((row, index) => {
                 const canBeEdited = ['PENDING_HOD', 'REVISION_REQUIRED'].includes(row.CurrentStatus);
                 const canEditOrDelete = currentUser.roleName === 'Requester' && row.RequesterID === currentUser.id && canBeEdited;
                 const isItemSelected = isSelected(row.RequestID);

                 const isCompletedTab = statusFilter === 'PROCESSED,COMPLETED';
                 const dateToShow = isCompletedTab && row.IT_CompletedAt 
                     ? row.IT_CompletedAt 
                     : (row.ApprovalTimestamp || row.RequestDate);

                return (
                    <motion.div 
                        key={`mobile-row-${row.RequestID}-${row.ApprovalID || index}`} 
                        variants={itemVariants} 
                        initial="hidden" 
                        animate="visible" 
                        layout
                    >
                        <Paper variant="outlined" sx={{ p: 2, display: 'flex', position: 'relative' }}>
                            {allowBulkActions && (
                                <Box sx={{ mr: 1.5 }} onClick={(event) => onSelectOneClick(event, row.RequestID)}>
                                    <Checkbox
                                        color="primary"
                                        checked={isItemSelected}
                                        inputProps={{ 'aria-labelledby': `request-mobile-checkbox-${index}` }}
                                    />
                                </Box>
                            )}
                            <Box sx={{ flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }} onClick={() => handleNavigateToDetail(row.RequestID)}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{row.RequestNumber || `#${row.RequestID}`}</Typography>
                                    {renderStatusChip(row.CurrentStatus, row.StatusName)}
                                </Box>
                                {/* ===== START: แก้ไขส่วนนี้ ===== */}
                                {row.NextApprovers && row.NextApprovers.length > 0 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                                        ⏳ รอ: {row.NextApprovers.join(', ')}
                                    </Typography>
                                )}
                                {/* ===== END: แก้ไขส่วนนี้ ===== */}
                                <Box sx={{ mb: 2, flexGrow: 1 }} onClick={() => handleNavigateToDetail(row.RequestID)}>
                                    <Tooltip title={row.ProblemDetail || '-'}>
                                        <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis', minHeight: 40, }}>
                                            {row.ProblemDetail || '-'}
                                        </Typography>
                                    </Tooltip>
                                </Box>
                                <Divider />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PersonIcon fontSize="small" color="action" /><Typography variant="caption">{row.RequesterName}</Typography></Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CalendarTodayIcon fontSize="small" color="action" /><Typography variant="caption">{new Date(dateToShow).toLocaleDateString('th-TH')}</Typography></Box>
                                    </Stack>
                                    <Box>
                                        {/* ===== START: แก้ไขส่วนนี้ ===== */}
                                        {row.LatestComment && (
                                            <Tooltip title={`${row.LatestCommentBy}: "${row.LatestComment}"`}>
                                                <IconButton size="small" sx={{ color: 'text.secondary' }}><ChatBubbleOutlineIcon fontSize="inherit" /></IconButton>
                                            </Tooltip>
                                        )}
                                        {/* ===== END: แก้ไขส่วนนี้ ===== */}
                                        <Tooltip title="ดูรายละเอียด"><IconButton size="small" onClick={() => handleNavigateToDetail(row.RequestID)}><VisibilityIcon fontSize="inherit" /></IconButton></Tooltip>
                                        {canEditOrDelete && (
                                            <>
                                                <Tooltip title="แก้ไข"><IconButton size="small" onClick={(e) => handleNavigateToEdit(e, row.RequestID)}><EditIcon fontSize="inherit" /></IconButton></Tooltip>
                                                <Tooltip title="ลบ"><IconButton size="small" onClick={(e) => handleDelete(e, row.RequestID)}><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
                                            </>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>
                    </motion.div>
                );
            })}
        </Stack>
    );

    return isMobile ? <MobileView /> : <DesktopView />;
};

export default RequestTable;