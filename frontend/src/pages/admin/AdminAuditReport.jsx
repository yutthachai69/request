import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, TextField, MenuItem,
    FormControl, InputLabel, Select, Button, Stack, Divider, Grid // ✅ 1. เพิ่ม Grid เข้ามาตรงนี้แทน
} from '@mui/material';
// ❌ ลบบรรทัด import Grid from "@mui/material/Grid2"; ออกไปเลยครับ

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
    const [filters, setFilters] = useState({
        departmentId: '',
        startDate: '',
        endDate: '',
        search: ''
    });
    const notification = useNotification();

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
        
        const worksheetData = data.map(item => ({
            'เลขที่คำร้อง': item.RequestNumber,
            'วันที่-เวลา': format(new Date(item.ApprovalTimestamp), 'dd/MM/yyyy HH:mm'),
            'ฝ่ายที่แจ้ง': item.DepartmentName,
            'ผู้แจ้ง': item.RequesterName,
            'กิจกรรม/ขั้นตอน': item.ActionType,
            'รายละเอียดการแก้ไข': item.Comment,
            'ผู้ดำเนินการ': item.ActionByName,
            'สถานะล่าสุด': item.StatusName
        }));

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "OperationAuditReport");
        XLSX.writeFile(wb, `Audit_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
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

            <TableContainer>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell>เลขที่</TableCell>
                            <TableCell>ฝ่ายที่แจ้ง</TableCell>
                            <TableCell>ผู้ดำเนินการ</TableCell>
                            <TableCell>ขั้นตอน/กิจกรรม</TableCell>
                            <TableCell>รายละเอียดการแก้ไข (Comment)</TableCell>
                            <TableCell>วันที่-เวลา</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : data.length > 0 ? (
                            data.map((row, index) => (
                                <TableRow key={index} hover>
                                    <TableCell>{row.RequestNumber}</TableCell>
                                    <TableCell>{row.DepartmentName}</TableCell>
                                    <TableCell>{row.ActionByName}</TableCell>
                                    <TableCell>{row.ActionType}</TableCell>
                                    <TableCell sx={{ color: 'primary.main', fontWeight: 500 }}>
                                        {row.Comment || '-'}
                                    </TableCell>
                                    <TableCell>{format(new Date(row.ApprovalTimestamp), 'dd/MM/yyyy HH:mm')}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={6} align="center">ไม่พบข้อมูลประวัติ</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default AdminAuditReport;