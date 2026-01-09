import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, TextField, MenuItem,
    FormControl, InputLabel, Select, Button, Stack, Divider, Grid,
    Accordion, AccordionSummary, AccordionDetails, IconButton, Chip
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import * as XLSX from 'xlsx';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import { format } from 'date-fns';

const AdminAuditReport = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [expandedRequests, setExpandedRequests] = useState(new Set());
    const [filters, setFilters] = useState({
        departmentId: '',
        startDate: '',
        endDate: '',
        search: ''
    });
    const notification = useNotification();

    // ✅ Group ข้อมูลตาม RequestNumber
    const groupedData = useMemo(() => {
        const grouped = {};
        data.forEach(item => {
            const requestNumber = item.RequestNumber || 'ไม่ระบุ';
            if (!grouped[requestNumber]) {
                grouped[requestNumber] = {
                    requestNumber,
                    departmentName: item.DepartmentName,
                    requesterName: item.RequesterName,
                    statusName: item.StatusName,
                    statusColorCode: item.StatusColorCode || '#9e9e9e',
                    locationName: item.LocationName,
                    requestDate: item.RequestDate,
                    correctionTypeNames: item.CorrectionTypeNames,
                    problemDetail: item.ProblemDetail,
                    history: []
                };
            }
            grouped[requestNumber].history.push(item);
        });
        // เรียงลำดับ history ตามเวลา (ใหม่สุดก่อน)
        Object.keys(grouped).forEach(key => {
            grouped[key].history.sort((a, b) => 
                new Date(b.ApprovalTimestamp) - new Date(a.ApprovalTimestamp)
            );
            // หาวันที่ล่าสุด
            if (grouped[key].history.length > 0) {
                grouped[key].latestDate = grouped[key].history[0].ApprovalTimestamp;
            }
        });
        return grouped;
    }, [data]);

    const handleToggleExpand = (requestNumber) => {
        setExpandedRequests(prev => {
            const newSet = new Set(prev);
            if (newSet.has(requestNumber)) {
                newSet.delete(requestNumber);
            } else {
                newSet.add(requestNumber);
            }
            return newSet;
        });
    };

    useEffect(() => {
        adminService.getDepartments()
            .then(res => setDepartments(res.data))
            .catch(() => notification.showNotification('โหลดข้อมูลฝ่ายล้มเหลว', 'error'));
    }, [notification]);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminService.getOperationAuditReport(filters); 
            console.log('Operation Audit Report Data:', res.data); // Debug log
            // Debug: ตรวจสอบ ProblemDetail และ CorrectionTypeNames
            if (res.data && res.data.length > 0) {
                const sampleItem = res.data[0];
                console.log('Sample item keys:', Object.keys(sampleItem));
                console.log('ProblemDetail in sample:', sampleItem.ProblemDetail);
                console.log('CorrectionTypeNames in sample:', sampleItem.CorrectionTypeNames);
                // หา item ที่มี ProblemDetail
                const itemWithProblem = res.data.find(item => item.ProblemDetail && item.ProblemDetail.trim() !== '');
                if (itemWithProblem) {
                    console.log('Found item with ProblemDetail:', itemWithProblem.ProblemDetail);
                } else {
                    console.warn('No ProblemDetail found in any items');
                }
            }
            setData(res.data || []);
        } catch (err) {
            console.error('Error fetching operation audit report:', err);
            notification.showNotification('ดึงข้อมูลรายงานล้มเหลว: ' + (err.response?.data?.message || err.message), 'error');
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [filters, notification]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleExportExcel = () => {
        if (data.length === 0) return;
        
        const wb = XLSX.utils.book_new();
        
        // ✅ ===== Sheet สรุป (1 row = 1 ใบร้องขอ) =====
        // Group ข้อมูลตามฝ่ายสำหรับสรุป
        const summaryByDepartment = {};
        
        Object.values(groupedData).forEach(group => {
            const deptName = group.departmentName || 'ไม่ระบุ';
            if (!summaryByDepartment[deptName]) {
                summaryByDepartment[deptName] = [];
            }
            
            // หาวันที่สร้าง (วันที่แรกสุด) และวันที่เสร็จสิ้น (วันที่ล่าสุด)
            const sortedHistory = [...group.history].sort((a, b) => 
                new Date(a.ApprovalTimestamp) - new Date(b.ApprovalTimestamp)
            );
            const firstDate = sortedHistory[0]?.ApprovalTimestamp;
            const lastDate = group.latestDate;
            
            // หาข้อมูลเพิ่มเติมจาก group หรือ history
            const requestDate = group.requestDate || sortedHistory[0]?.RequestDate || firstDate;
            
            // หา CorrectionTypeNames และ ProblemDetail จาก history (ควรมีเหมือนกันทุกแถว เพราะเป็นของ Request เดียวกัน)
            // ลองหาจาก history item ที่มี ProblemDetail ไม่เป็น null หรือ empty
            let correctionTypeNames = group.history.find(h => h.CorrectionTypeNames && h.CorrectionTypeNames !== 'ไม่ระบุ')?.CorrectionTypeNames || group.history[0]?.CorrectionTypeNames || '-';
            let problemDetail = group.history.find(h => h.ProblemDetail && h.ProblemDetail.trim() !== '')?.ProblemDetail || group.history[0]?.ProblemDetail || group.problemDetail || '-';
            
            // ถ้ายังหาไม่เจอ ให้ลองหาใหม่จาก history ทั้งหมด
            if (problemDetail === '-' && group.history.length > 0) {
                for (const histItem of group.history) {
                    if (histItem.ProblemDetail && histItem.ProblemDetail.trim() !== '' && histItem.ProblemDetail !== 'ไม่ระบุ') {
                        problemDetail = histItem.ProblemDetail;
                        break;
                    }
                }
            }
            
            summaryByDepartment[deptName].push({
                'เลขที่คำร้อง': group.requestNumber,
                'ฝ่ายที่แจ้ง': group.departmentName,
                'ผู้แจ้ง': group.requesterName,
                'รายละเอียดที่ขอแก้ไข': correctionTypeNames,
                'รายละเอียดปัญหา': problemDetail,
                'สถานะล่าสุด': group.statusName,
                'วันที่สร้าง': requestDate ? format(new Date(requestDate), 'dd/MM/yyyy HH:mm') : '-',
                'วันที่เสร็จสิ้น': lastDate ? format(new Date(lastDate), 'dd/MM/yyyy HH:mm') : '-',
                'จำนวนขั้นตอน': group.history.length,
                'ขั้นตอนล่าสุด': group.history[0]?.ActionType || '-',
                'ผู้ดำเนินการล่าสุด': group.history[0]?.ActionByName || '-'
            });
        });
        
        // ✅ Sheet สรุปทั้งหมด (เรียงตามเลขที่คำร้อง)
        const allSummary = [];
        Object.values(summaryByDepartment).forEach(deptData => {
            allSummary.push(...deptData);
        });
        // เรียงตามเลขที่คำร้อง (ใหม่สุดก่อน)
        allSummary.sort((a, b) => {
            const numA = parseInt(a['เลขที่คำร้อง']?.replace(/\D/g, '') || '0');
            const numB = parseInt(b['เลขที่คำร้อง']?.replace(/\D/g, '') || '0');
            return numB - numA;
        });
        // เพิ่มลำดับที่
        allSummary.forEach((item, index) => {
            item['ลำดับที่'] = index + 1;
        });
        // จัดเรียงคอลัมน์ให้ลำดับที่อยู่หน้า
        const summaryColumns = ['ลำดับที่', 'เลขที่คำร้อง', 'ฝ่ายที่แจ้ง', 'ผู้แจ้ง', 'รายละเอียดที่ขอแก้ไข', 'รายละเอียดปัญหา', 'สถานะล่าสุด', 'วันที่สร้าง', 'วันที่เสร็จสิ้น', 'จำนวนขั้นตอน', 'ขั้นตอนล่าสุด', 'ผู้ดำเนินการล่าสุด'];
        const wsSummaryAll = XLSX.utils.json_to_sheet(allSummary, { header: summaryColumns });
        XLSX.utils.book_append_sheet(wb, wsSummaryAll, "สรุปทั้งหมด");
        
        // ✅ Sheet สรุปแยกตามฝ่าย (เรียงตามเลขที่คำร้อง)
        Object.keys(summaryByDepartment).sort().forEach(deptName => {
            const deptData = summaryByDepartment[deptName];
            // เรียงตามเลขที่คำร้อง (ใหม่สุดก่อน)
            deptData.sort((a, b) => {
                const numA = parseInt(a['เลขที่คำร้อง']?.replace(/\D/g, '') || '0');
                const numB = parseInt(b['เลขที่คำร้อง']?.replace(/\D/g, '') || '0');
                return numB - numA;
            });
            // เพิ่มลำดับที่
            deptData.forEach((item, index) => {
                item['ลำดับที่'] = index + 1;
            });
            const ws = XLSX.utils.json_to_sheet(deptData, { header: summaryColumns });
            let sheetName = `สรุป-${deptName}`;
            sheetName = sheetName.length > 31 ? sheetName.substring(0, 31) : sheetName;
            sheetName = sheetName.replace(/[\\\/\?\*\[\]]/g, '_');
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
        
        // ✅ ===== Sheet รายละเอียด (1 row = 1 action) - แบบครอบคลุม =====
        // Group ข้อมูลตามฝ่ายสำหรับรายละเอียด (ข้อมูลจาก data ถูกเรียงตาม ApprovalTimestamp DESC อยู่แล้ว)
        const detailByDepartment = {};
        let rowNumber = 0;
        
        data.forEach((item, index) => {
            const deptName = item.DepartmentName || 'ไม่ระบุ';
            if (!detailByDepartment[deptName]) {
                detailByDepartment[deptName] = [];
                rowNumber = 0; // Reset row number สำหรับแต่ละฝ่าย
            }
            rowNumber++;
            
            // แยกวันที่และเวลา
            const approvalDate = new Date(item.ApprovalTimestamp);
            const requestDate = item.RequestDate ? new Date(item.RequestDate) : approvalDate;
            
            // Parse ProblemDetail เพื่อหาทะเบียนรถ, ค่าเดิม, ค่าใหม่
            let vehicleRegistration = '-';
            let originalValue = '-';
            let newValue = '-';
            
            try {
                // ลอง parse จาก ProblemDetail หรือ Comment
                if (item.ProblemDetail) {
                    // หาทะเบียนรถ
                    const problemMatch = item.ProblemDetail.match(/ทะเบียน[:\s]*([^\s,]+)/i);
                    if (problemMatch) vehicleRegistration = problemMatch[1];
                    
                    // หาค่าเดิมและค่าใหม่ (เช่น "แก้ไขโควตาจาก (11111) เป็น (22222)")
                    const fromToMatch = item.ProblemDetail.match(/จาก\s*\(([^)]+)\)\s*เป็น\s*\(([^)]+)\)/i);
                    if (fromToMatch) {
                        originalValue = fromToMatch[1];
                        newValue = fromToMatch[2];
                    }
                }
                if (item.Comment) {
                    const commentMatch = item.Comment.match(/ทะเบียน[:\s]*([^\s,]+)/i);
                    if (commentMatch && vehicleRegistration === '-') vehicleRegistration = commentMatch[1];
                }
            } catch (e) {
                // ถ้า parse ไม่ได้ ให้ใช้ค่าเดิม
            }
            
            // หา ProblemDetail และ CorrectionTypeNames (ควรเหมือนกันทุกแถวของ Request เดียวกัน)
            // ตรวจสอบ ProblemDetail อย่างละเอียด
            let problemDetailForRow = '-';
            if (item.ProblemDetail) {
                const trimmed = item.ProblemDetail.trim();
                if (trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
                    problemDetailForRow = trimmed;
                }
            }
            
            const correctionTypeForRow = item.CorrectionTypeNames && item.CorrectionTypeNames !== 'ไม่ระบุ' && item.CorrectionTypeNames.trim() !== '' ? item.CorrectionTypeNames : '-';
            
            detailByDepartment[deptName].push({
                'ลำดับที่': rowNumber,
                'วันที่ขอแก้ไข': format(requestDate, 'dd/MM/yyyy'),
                'เวลา': format(approvalDate, 'HH:mm'),
                'ชื่อผู้ขอแก้ไข': item.RequesterName || '-',
                'สถานี': item.LocationName || '-',
                'เลขที่': item.RequestNumber || '-',
                'รายละเอียดที่ขอแก้ไข': correctionTypeForRow,
                'รายละเอียดปัญหา': problemDetailForRow,
                'ทะเบียนรถ': vehicleRegistration,
                'ค่าเดิม': originalValue,
                'ค่าใหม่': newValue,
                'หมายเหตุ': item.Comment || '-',
                'ผู้แก้ไข': item.ActionByName || '-',
                'สถานะส่งเอกสาร': item.StatusName || '-'
            });
        });
        
        // ✅ Sheet รายละเอียดแยกตามฝ่าย (เรียงตามวันที่-เวลา ใหม่สุดก่อน - ข้อมูลถูกเรียงอยู่แล้วจาก backend)
        const detailColumns = ['ลำดับที่', 'วันที่ขอแก้ไข', 'เวลา', 'ชื่อผู้ขอแก้ไข', 'สถานี', 'เลขที่', 'รายละเอียดที่ขอแก้ไข', 'รายละเอียดปัญหา', 'ทะเบียนรถ', 'ค่าเดิม', 'ค่าใหม่', 'หมายเหตุ', 'ผู้แก้ไข', 'สถานะส่งเอกสาร'];
        Object.keys(detailByDepartment).sort().forEach(deptName => {
            const ws = XLSX.utils.json_to_sheet(detailByDepartment[deptName], { header: detailColumns });
            let sheetName = `รายละเอียด-${deptName}`;
            sheetName = sheetName.length > 31 ? sheetName.substring(0, 31) : sheetName;
            sheetName = sheetName.replace(/[\\\/\?\*\[\]]/g, '_');
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
        
        // ✅ บันทึกไฟล์
        XLSX.writeFile(wb, `Audit_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
        notification.showNotification('ส่งออกไฟล์ Excel สำเร็จ (สรุป + รายละเอียด)', 'success');
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
                รายงานประวัติการดำเนินการและการแก้ไข (Admin Only)
            </Typography>

            {/* ส่วนตัวกรองข้อมูล - ✅ แก้ไขการใช้ Grid ให้รองรับ MUI รุ่นเก่า */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small">
                        <InputLabel>เลือกฝ่าย</InputLabel>
                        <Select
                            value={filters.departmentId}
                            label="เลือกฝ่าย"
                            onChange={(e) => setFilters({...filters, departmentId: e.target.value})}
                        >
                            <MenuItem value="">ทั้งหมด</MenuItem>
                            {departments.map(dept => (
                                <MenuItem key={dept.DepartmentID} value={dept.DepartmentID}>
                                    {dept.DepartmentName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                    <TextField
                        label="เริ่มวันที่"
                        type="date"
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={filters.startDate}
                        onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    />
                </Grid>
                <Grid item xs={12} md={2}>
                    <TextField
                        label="ถึงวันที่"
                        type="date"
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={filters.endDate}
                        onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField
                        label="ค้นหาคำร้อง/ชื่อ"
                        fullWidth
                        size="small"
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                </Grid>
                <Grid item xs={12} md={2}>
                    <Button 
                        variant="contained" 
                        fullWidth 
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportExcel}
                        disabled={data.length === 0}
                    >
                        Export Excel
                    </Button>
                </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : Object.keys(groupedData).length > 0 ? (
                <Box>
                    {Object.values(groupedData).map((group) => {
                        const isExpanded = expandedRequests.has(group.requestNumber);
                        const historyCount = group.history.length;
                        return (
                            <Paper 
                                key={group.requestNumber} 
                                variant="outlined" 
                                sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}
                            >
                                {/* Header Row - แสดงเลขที่เอกสาร */}
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: isExpanded ? 'primary.light' : 'grey.50',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                        '&:hover': {
                                            bgcolor: isExpanded ? 'primary.light' : 'grey.100'
                                        }
                                    }}
                                    onClick={() => handleToggleExpand(group.requestNumber)}
                                >
                                    {/* แถวแรก: เลขที่เอกสาร และข้อมูลหลัก */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <IconButton size="small" sx={{ mr: 1 }}>
                                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', mr: 2, minWidth: 120 }}>
                                            {group.requestNumber}
                                        </Typography>
                                        
                                        {/* ฝ่ายที่แจ้ง - แสดงให้เด่น */}
                                        <Chip 
                                            label={group.departmentName || 'ไม่ระบุ'} 
                                            color="primary" 
                                            variant="filled"
                                            sx={{ 
                                                mr: 2,
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem',
                                                height: 28
                                            }}
                                        />
                                        
                                        {/* สถานะล่าสุด - ใช้สีจากฐานข้อมูล หรือสีเขียวสำหรับ "เสร็จสิ้น" */}
                                        {group.statusName && (() => {
                                            // ถ้าเป็นสถานะ "เสร็จสิ้น" ให้ใช้สีเขียว
                                            const isCompleted = group.statusName.includes('เสร็จ') || group.statusName.includes('เสร็จสิ้น') || group.statusName.includes('Completed');
                                            const statusColor = isCompleted ? '#4caf50' : (group.statusColorCode || '#9e9e9e');
                                            
                                            return (
                                                <Chip 
                                                    label={group.statusName} 
                                                    size="small"
                                                    sx={{ 
                                                        mr: 2,
                                                        backgroundColor: statusColor,
                                                        color: (theme) => {
                                                            // ตรวจสอบว่าสีพื้นหลังสว่างหรือมืด เพื่อเลือกสีตัวอักษรให้เหมาะสม
                                                            const rgb = statusColor.match(/\d+/g);
                                                            if (rgb && rgb.length >= 3) {
                                                                const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                                                                return brightness > 128 ? '#000000' : '#ffffff';
                                                            }
                                                            return theme.palette.getContrastText(statusColor);
                                                        },
                                                        fontWeight: 'bold',
                                                        border: `1px solid ${statusColor}`
                                                    }}
                                                />
                                            );
                                        })()}
                                        
                                        <Box sx={{ flexGrow: 1 }} />
                                        
                                        {/* จำนวนรายการ */}
                                        <Chip 
                                            label={`${historyCount} รายการ`} 
                                            color="info" 
                                            variant="outlined"
                                            size="small"
                                            sx={{ mr: 2 }}
                                        />
                                        
                                        {/* วันที่ล่าสุด */}
                                        {group.latestDate && (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                                {format(new Date(group.latestDate), 'dd/MM/yyyy HH:mm')}
                                            </Typography>
                                        )}
                                    </Box>
                                    
                                    {/* แถวที่สอง: ผู้แจ้ง และรายละเอียดปัญหา */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 5, flexWrap: 'wrap', gap: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                            <strong>ผู้แจ้ง:</strong> {group.requesterName || 'ไม่ระบุ'}
                                        </Typography>
                                        {(() => {
                                            // หา ProblemDetail จาก history
                                            const problemDetail = group.history.find(h => h.ProblemDetail && h.ProblemDetail.trim() !== '')?.ProblemDetail || group.problemDetail;
                                            if (problemDetail && problemDetail.trim() !== '' && problemDetail !== '-') {
                                                return (
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', flex: 1 }}>
                                                        <strong>รายละเอียดปัญหา:</strong> {problemDetail}
                                                    </Typography>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </Box>
                                </Box>

                                {/* รายละเอียด - แสดงเมื่อ expand */}
                                {isExpanded && (
                                    <Box sx={{ p: 2 }}>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                                    <TableRow>
                                                        <TableCell>ผู้ดำเนินการ</TableCell>
                                                        <TableCell>ขั้นตอน/กิจกรรม</TableCell>
                                                        <TableCell>รายละเอียดปัญหา</TableCell>
                                                        <TableCell>รายละเอียดการแก้ไข (Comment)</TableCell>
                                                        <TableCell>วันที่-เวลา</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {group.history.map((item, idx) => {
                                                        // หา ProblemDetail จาก item หรือ group
                                                        const problemDetail = item.ProblemDetail && item.ProblemDetail.trim() !== '' 
                                                            ? item.ProblemDetail 
                                                            : (group.problemDetail && group.problemDetail.trim() !== '' ? group.problemDetail : '-');
                                                        
                                                        return (
                                                            <TableRow key={idx} hover>
                                                                <TableCell>{item.ActionByName || '-'}</TableCell>
                                                                <TableCell>{item.ActionType || '-'}</TableCell>
                                                                <TableCell sx={{ maxWidth: 300, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                    {problemDetail !== '-' ? problemDetail : '-'}
                                                                </TableCell>
                                                                <TableCell sx={{ color: 'primary.main', fontWeight: 500 }}>
                                                                    {item.Comment || '-'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {format(new Date(item.ApprovalTimestamp), 'dd/MM/yyyy HH:mm')}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}
                            </Paper>
                        );
                    })}
                </Box>
            ) : (
                <Box display="flex" justifyContent="center" p={4}>
                    <Typography color="text.secondary">ไม่พบข้อมูลประวัติ</Typography>
                </Box>
            )}
        </Paper>
    );
};

export default AdminAuditReport;