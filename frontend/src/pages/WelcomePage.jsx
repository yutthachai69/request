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
            component={motion.div}
            whileHover={{ scale: 1.02 }}
            sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 3.5, 
                borderRadius: 4, 
                height: '100%',
                background: (theme) => `linear-gradient(135deg, ${alpha(color, 0.2)} 0%, ${alpha(color, 0.08)} 50%, ${alpha(color, 0.05)} 100%)`,
                border: `2px solid ${alpha(color, 0.25)}`,
                boxShadow: `0 4px 16px ${alpha(color, 0.15)}, 0 2px 8px rgba(0,0,0,0.08)`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: '150px',
                    height: '150px',
                    background: `radial-gradient(circle, ${alpha(color, 0.1)} 0%, transparent 70%)`,
                    borderRadius: '50%',
                },
                '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 12px 32px ${alpha(color, 0.3)}, 0 4px 16px rgba(0,0,0,0.12)`,
                    borderColor: alpha(color, 0.5),
                    '& .stat-icon': {
                        transform: 'scale(1.1) rotate(5deg)',
                    }
                }
            }} 
            variant="outlined"
        >
            <Avatar 
                className="stat-icon"
                sx={{ 
                    bgcolor: (theme) => `linear-gradient(135deg, ${alpha(color, 0.25)} 0%, ${alpha(color, 0.15)} 100%)`, 
                    color: color, 
                    width: 72, 
                    height: 72, 
                    mr: 3,
                    border: `3px solid ${alpha(color, 0.4)}`,
                    boxShadow: `0 6px 20px ${alpha(color, 0.25)}, inset 0 2px 4px ${alpha(color, 0.1)}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '2rem'
                }}
            >
                {icon}
            </Avatar>
            <Box sx={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5, color: color, lineHeight: 1.2 }}>
                    {value}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.95rem' }}>
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
            component={motion.div}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            sx={{ 
                p: 5, 
                borderRadius: 4, 
                mb: 4, 
                color: 'white', 
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 50%, ${theme.palette.secondary.main} 100%)`,
                boxShadow: '0 12px 40px rgba(25, 118, 210, 0.4), 0 4px 16px rgba(0,0,0,0.1)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -100,
                    right: -100,
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                    borderRadius: '50%',
                    transform: 'translate(30%, -30%)'
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: -80,
                    left: -80,
                    width: '250px',
                    height: '250px',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    transform: 'translate(-30%, 30%)'
                }
            }}
        >
            <Typography 
                variant="h3" 
                sx={{ 
                    fontWeight: 800, 
                    mb: 1.5, 
                    position: 'relative', 
                    zIndex: 1,
                    textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' }
                }}
            >
                {getGreeting()}, {user.fullName}! 👋
            </Typography>
            <Typography 
                sx={{ 
                    opacity: 0.98, 
                    fontSize: '1.2rem', 
                    position: 'relative', 
                    zIndex: 1,
                    fontWeight: 500,
                    textShadow: '0 1px 4px rgba(0,0,0,0.15)'
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
                                    component={motion.div}
                                    whileHover={{ y: -4 }}
                                    sx={{ 
                                        borderRadius: 4,
                                        boxShadow: '0 6px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
                                        border: `2px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        background: (theme) => `linear-gradient(to bottom, ${alpha(theme.palette.primary.main, 0.02)} 0%, transparent 100%)`,
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1)',
                                            borderColor: alpha(theme.palette.primary.main, 0.3),
                                        }
                                    }} 
                                    variant="outlined"
                                >
                                    <CardHeader 
                                        avatar={
                                            <Avatar sx={{
                                                bgcolor: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`, 
                                                color: 'primary.main',
                                                border: (theme) => `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                                width: 48,
                                                height: 48,
                                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`
                                            }}>
                                                <AssessmentIcon />
                                            </Avatar>
                                        }
                                        title="ปริมาณคำร้องตามหมวดหมู่"
                                        titleTypographyProps={{fontWeight: 700, fontSize: '1.2rem', color: 'primary.main'}}
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
                    const cardColor = isStatusChart ? theme.palette.secondary.main : theme.palette.info.main;
                    
                    return (
                        <Grid item xs={12} md={6} key={index}>
                            <motion.div variants={itemVariants}>
                                <Card 
                                    component={motion.div}
                                    whileHover={{ y: -4 }}
                                    sx={{ 
                                        borderRadius: 4, 
                                        height: '100%',
                                        boxShadow: `0 6px 24px ${alpha(cardColor, 0.1)}, 0 2px 8px rgba(0,0,0,0.06)`,
                                        border: `2px solid ${alpha(cardColor, 0.15)}`,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        background: (theme) => `linear-gradient(to bottom, ${alpha(cardColor, 0.03)} 0%, transparent 100%)`,
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: `0 12px 40px ${alpha(cardColor, 0.2)}, 0 4px 16px rgba(0,0,0,0.1)`,
                                            borderColor: alpha(cardColor, 0.3),
                                        }
                                    }} 
                                    variant="outlined"
                                >
                                    <CardHeader 
                                        avatar={
                                            <Avatar sx={{
                                                bgcolor: (theme) => `linear-gradient(135deg, ${alpha(cardColor, 0.2)} 0%, ${alpha(cardColor, 0.1)} 100%)`, 
                                                color: cardColor,
                                                border: (theme) => `2px solid ${alpha(cardColor, 0.3)}`,
                                                width: 48,
                                                height: 48,
                                                boxShadow: `0 4px 12px ${alpha(cardColor, 0.2)}`
                                            }}>
                                                {isStatusChart ? <DonutLargeIcon /> : <BarChartIcon />}
                                            </Avatar>
                                        }
                                        title={chart.categoryName}
                                        titleTypographyProps={{
                                            fontWeight: 700, 
                                            fontSize: '1.2rem',
                                            color: cardColor
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