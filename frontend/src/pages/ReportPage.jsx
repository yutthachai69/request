// frontend/src/pages/ReportPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Grid, CircularProgress, Card, CardHeader, Avatar, CardContent, Stack, Button } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import dashboardService from '../services/dashboardService';
import CategoryChart from '../components/CategoryChart'; 
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Icons
import AssessmentIcon from '@mui/icons-material/Assessment';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import SearchIcon from '@mui/icons-material/Search';

ChartJS.register(ArcElement, Tooltip, Legend);

const StatCard = ({ title, value, icon, color = 'text.primary' }) => (
    <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'transparent', color, border: `2px solid ${color}` }}>{icon}</Avatar>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{value}</Typography>
                    <Typography variant="body2" color="text.secondary">{title}</Typography>
                </Box>
            </Stack>
        </CardContent>
    </Card>
);

const ReportPage = () => {
    const { user } = useAuth();
    const notification = useNotification();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });

    const fetchReportData = useCallback(() => {
        setLoading(true);
        const params = {
            startDate: dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : undefined,
            endDate: dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : undefined,
        };
        dashboardService.getReportData(params)
            .then(res => setReportData(res.data))
            .catch(() => notification.showNotification('Failed to load report data', 'error'))
            .finally(() => setLoading(false));
    }, [notification, dateRange]);
    
    useEffect(() => {
        fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }
    if (!reportData) {
        return <Typography>No report data available.</Typography>;
    }

    const { summary, byStatus, byCategory } = reportData;

    const statusChartData = {
        labels: byStatus.map(d => d.StatusName),
        datasets: [{
            data: byStatus.map(d => d.count),
            backgroundColor: ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0'],
        }]
    };
    
    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {user.level === 0 ? 'Global System Report' : 'Department Report'}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                An overview of request activities and performance.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid xs={12} sm={5}><DatePicker label="Start Date" value={dateRange.startDate} onChange={(d) => setDateRange(p => ({...p, startDate: d}))} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                    <Grid xs={12} sm={5}><DatePicker label="End Date" value={dateRange.endDate} onChange={(d) => setDateRange(p => ({...p, endDate: d}))} minDate={dateRange.startDate} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                    <Grid xs={12} sm={2}><Button variant="contained" onClick={fetchReportData} fullWidth startIcon={<SearchIcon />}>Filter</Button></Grid>
                </Grid>
            </Paper>

            <Grid container spacing={3}>
                <Grid xs={12} md={3}><StatCard title="Total Requests" value={summary.totalRequests} icon={<AssessmentIcon />} color="primary.main" /></Grid>
                <Grid xs={12} md={3}><StatCard title="Completed" value={summary.completedRequests} icon={<CheckCircleOutlineIcon />} color="success.main" /></Grid>
                <Grid xs={12} md={3}><StatCard title="Rejected / Sent for Revision" value={summary.rejectedRequests} icon={<CancelOutlinedIcon />} color="error.main" /></Grid>
                <Grid xs={12} md={3}><StatCard title="Avg. Completion Time" value={`${parseFloat(summary.avgCompletionHours || 0).toFixed(1)} hrs`} icon={<SpeedIcon />} color="info.main" /></Grid>
                
                <Grid xs={12} md={8}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardHeader title="Requests by Category" />
                        <CardContent sx={{ height: 400 }}>
                            <CategoryChart chartData={byCategory} />
                        </CardContent>
                    </Card>
                </Grid>
                <Grid xs={12} md={4}>
                    <Card variant="outlined">
                        <CardHeader title="Requests by Status" />
                        <CardContent sx={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                           <Doughnut data={statusChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ReportPage;