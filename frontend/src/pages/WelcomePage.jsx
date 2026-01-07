// frontend/src/pages/WelcomePage.jsx
import React, { useState, useEffect } from 'react';
import {
    Typography, Box, Grid, Card, CircularProgress, CardContent, CardHeader, Avatar
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';

import { useAuth } from '../context/AuthContext';
import dashboardService from '../services/dashboardService';
import StatusBreakdownChart from '../components/StatusBreakdownChart';
import LocationBreakdownChart from '../components/LocationBreakdownChart';
import CategoryChart from '../components/CategoryChart';

// Icons
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import BarChartIcon from '@mui/icons-material/BarChart';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

const StatCard = ({ title, value, icon, color }) => {
    return (
        <Card sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 3, 
            borderRadius: 4, 
            height: '100%',
            backgroundColor: (theme) => alpha(color, 0.1)
        }} variant="outlined">
            <Avatar sx={{ bgcolor: 'transparent', color: color, width: 56, height: 56, mr: 2, border: '2px solid' }}>
                {icon}
            </Avatar>
            <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{value}</Typography>
                <Typography variant="body2" color="text.secondary">{title}</Typography>
            </Box>
        </Card>
    );
};

const WelcomeBanner = ({ user }) => {
    return (
        <Box sx={{ p: 4, borderRadius: 4, mb: 4, color: 'white', background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)` }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>ยินดีต้อนรับ, {user.fullName}!</Typography>
            <Typography sx={{ opacity: 0.8 }}>ภาพรวมสถานะของระบบในปัจจุบัน</Typography>
        </Box>
    );
};

const WelcomePage = () => {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [charts, setCharts] = useState([]);
    const [globalStats, setGlobalStats] = useState(null); 
    const theme = useTheme(); 

    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        Promise.all([
            dashboardService.getCategoryStatistics(),
            dashboardService.getGlobalStatistics()
        ]).then(([categoryStatsRes, globalStatsRes]) => {
            setCharts(categoryStatsRes.data);
            setGlobalStats(globalStatsRes.data);
        }).catch(error => {
            console.error("ไม่สามารถโหลดข้อมูลแดชบอร์ดได้", error);
        }).finally(() => {
            setLoading(false);
        });

    }, [currentUser]);

    if (loading) {
        return <Box sx={{display: 'flex', justifyContent: 'center', mt: 5}}><CircularProgress /></Box>
    }
    if (!currentUser) return null;

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants}>
                <WelcomeBanner user={currentUser} />
            </motion.div>

            <Grid container spacing={3}>
                {currentUser.roleName === 'Admin' && globalStats && (
                    <>
                        <Grid item xs={12} sm={6}>
                            <motion.div variants={itemVariants}>
                                <StatCard 
                                    title="คำร้องที่รอดำเนินการ" 
                                    value={globalStats.pendingRequestCount}
                                    icon={<HourglassTopIcon />}
                                    color={theme.palette.warning.main}
                                />
                            </motion.div>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <motion.div variants={itemVariants}>
                                <StatCard 
                                    title="เวลาอนุมัติเฉลี่ย" 
                                    value={`${globalStats.averageApprovalTimeInHours} ชั่วโมง`}
                                    icon={<AccessTimeIcon />}
                                    color={theme.palette.info.main}
                                />
                            </motion.div>
                        </Grid>
                        <Grid item xs={12}>
                            <motion.div variants={itemVariants}>
                                <Card sx={{ borderRadius: 4 }} variant="outlined">
                                    <CardHeader 
                                        avatar={<Avatar sx={{bgcolor: 'action.hover', color: 'text.secondary'}}><AssessmentIcon /></Avatar>}
                                        title="ปริมาณคำร้องตามหมวดหมู่"
                                        titleTypographyProps={{fontWeight: 'bold'}}
                                    />
                                    <CardContent sx={{height: '350px'}}>
                                        <CategoryChart chartData={globalStats.requestCountByCategory} />
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    </>
                )}

                {charts.map((chart, index) => (
                    <Grid item xs={12} md={6} key={index}>
                        <motion.div variants={itemVariants}>
                            <Card sx={{ borderRadius: 4, height: '100%' }} variant="outlined">
                                <CardHeader 
                                    avatar={
                                        <Avatar sx={{bgcolor: 'action.hover', color: 'text.secondary'}}>
                                            {chart.chartType === 'status' ? <DonutLargeIcon /> : <BarChartIcon />}
                                        </Avatar>
                                    }
                                    title={chart.categoryName}
                                    titleTypographyProps={{fontWeight: 'bold'}}
                                />
                                <CardContent sx={{height: '300px'}}>
                                    {chart.chartType === 'status' && <StatusBreakdownChart chartData={chart.data} />}
                                    {chart.chartType === 'location' && <LocationBreakdownChart chartData={chart.data} />}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                ))}
            </Grid>
        </motion.div>
    );
};

export default WelcomePage;