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
        <Card 
            sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 3, 
                borderRadius: 2, 
                height: '100%',
                background: (theme) => `linear-gradient(135deg, ${alpha(color, 0.12)} 0%, ${alpha(color, 0.06)} 100%)`,
                border: `1px solid ${alpha(color, 0.25)}`,
                boxShadow: `0 2px 8px ${alpha(color, 0.1)}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                    boxShadow: `0 4px 16px ${alpha(color, 0.2)}`,
                    borderColor: alpha(color, 0.4),
                    transform: 'translateY(-2px)',
                }
            }} 
            variant="outlined"
        >
            <Avatar 
                sx={{ 
                    bgcolor: alpha(color, 0.15), 
                    color: color, 
                    width: 56, 
                    height: 56, 
                    mr: 2.5,
                    border: `2px solid ${alpha(color, 0.3)}`,
                    boxShadow: `0 2px 8px ${alpha(color, 0.2)}`,
                }}
            >
                {icon}
            </Avatar>
            <Box sx={{ flex: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: color }}>
                    {value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {title}
                </Typography>
            </Box>
        </Card>
    );
};

const WelcomeBanner = ({ user }) => {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'สวัสดีตอนเช้า';
        if (hour < 18) return 'สวัสดีตอนบ่าย';
        return 'สวัสดีตอนเย็น';
    };

    const theme = useTheme();

    return (
        <Box 
            sx={{ 
                p: 4, 
                borderRadius: 2, 
                mb: 4, 
                color: 'white', 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: '200px',
                    height: '200px',
                    background: `radial-gradient(circle, ${alpha('#fff', 0.1)} 0%, transparent 70%)`,
                    borderRadius: '50%',
                }
            }}
        >
            <Typography 
                variant="h4" 
                sx={{ 
                    fontWeight: 600, 
                    mb: 1,
                    position: 'relative',
                    zIndex: 1
                }}
            >
                {getGreeting()}, {user.fullName}!
            </Typography>
            <Typography 
                sx={{ 
                    opacity: 0.95, 
                    fontSize: '1rem',
                    position: 'relative',
                    zIndex: 1
                }}
            >
                ภาพรวมสถานะของระบบในปัจจุบัน
            </Typography>
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
        return (
            <Box sx={{
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                minHeight: '60vh',
                flexDirection: 'column',
                gap: 2
            }}>
                <CircularProgress size={48} sx={{ color: 'primary.main' }} />
                <Typography variant="body1" color="text.secondary">กำลังโหลดข้อมูล...</Typography>
            </Box>
        );
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
                                <Card 
                                    sx={{ 
                                        borderRadius: 2,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        }
                                    }} 
                                    variant="outlined"
                                >
                                    <CardHeader 
                                        avatar={
                                            <Avatar sx={{
                                                bgcolor: alpha(theme.palette.primary.main, 0.1), 
                                                color: 'primary.main',
                                            }}>
                                                <AssessmentIcon />
                                            </Avatar>
                                        }
                                        title="ปริมาณคำร้องตามหมวดหมู่"
                                        titleTypographyProps={{fontWeight: 600, fontSize: '1.1rem'}}
                                    />
                                    <CardContent sx={{height: '350px', pt: 0, pb: 3}}>
                                        <CategoryChart chartData={globalStats.requestCountByCategory} />
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    </>
                )}

                {charts.map((chart, index) => {
                    const isStatusChart = chart.chartType === 'status';
                    
                    return (
                        <Grid item xs={12} md={6} key={index}>
                            <motion.div variants={itemVariants}>
                                <Card 
                                    sx={{ 
                                        borderRadius: 2, 
                                        height: '100%',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        }
                                    }} 
                                    variant="outlined"
                                >
                                    <CardHeader 
                                        avatar={
                                            <Avatar sx={{
                                                bgcolor: alpha(theme.palette.secondary.main, 0.1), 
                                                color: 'secondary.main',
                                            }}>
                                                {isStatusChart ? <DonutLargeIcon /> : <BarChartIcon />}
                                            </Avatar>
                                        }
                                        title={chart.categoryName}
                                        titleTypographyProps={{
                                            fontWeight: 600, 
                                            fontSize: '1.1rem'
                                        }}
                                    />
                                    <CardContent sx={{height: '300px', pt: 0, pb: 3}}>
                                        {isStatusChart && <StatusBreakdownChart chartData={chart.data} />}
                                        {!isStatusChart && <LocationBreakdownChart chartData={chart.data} />}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    );
                })}
            </Grid>
        </motion.div>
    );
};

export default WelcomePage;