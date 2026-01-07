// frontend/src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Stack, Alert, CircularProgress, Card, CardContent, CardHeader, Avatar, Grid } from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import authService from '../services/authService';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SaveIcon from '@mui/icons-material/Save';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BarChartIcon from '@mui/icons-material/BarChart';

// Reusable StatCard component
const StatCard = ({ title, value, icon, color }) => (
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


const ProfilePage = () => {
    const notification = useNotification();
    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [apiError, setApiError] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // --- START: ADD state for stats ---
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    // --- END: ADD state for stats ---

    // --- START: ADD useEffect to fetch stats ---
    useEffect(() => {
        authService.getMyStats()
            .then(res => {
                setStats(res.data);
            })
            .catch(() => {
                notification.showNotification('Could not load user statistics', 'error');
            })
            .finally(() => {
                setLoadingStats(false);
            });
    }, [notification]);
    // --- END: ADD useEffect to fetch stats ---


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (formErrors[e.target.name]) {
            setFormErrors({ ...formErrors, [e.target.name]: null });
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.oldPassword) {
            errors.oldPassword = 'กรุณากรอกรหัสผ่านเดิม';
        }
        if (formData.newPassword.length > 0 && formData.newPassword.length < 6) {
            errors.newPassword = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร';
        }
        if (formData.newPassword !== formData.confirmPassword) {
            errors.confirmPassword = 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError('');
        setSuccess('');

        if (!validateForm()) {
            return;
        }
        
        setLoading(true);
        try {
            const res = await authService.changePassword({
                oldPassword: formData.oldPassword,
                newPassword: formData.newPassword,
            });
            setSuccess(res.data.message);
            notification.showNotification(res.data.message, 'success');
            setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            const message = err.response?.data?.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้';
            setApiError(message);
            notification.showNotification(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
            <Stack spacing={4}>
                {/* --- START: Stats Section --- */}
                <Card variant="outlined" sx={{ borderRadius: 4 }}>
                    <CardHeader
                        avatar={<Avatar sx={{bgcolor: 'secondary.main'}}><BarChartIcon /></Avatar>}
                        title={<Typography variant="h5" sx={{fontWeight: 'bold'}}>สถิติของคุณ</Typography>}
                    />
                    <CardContent>
                        {loadingStats ? <CircularProgress /> : (
                            stats && (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <StatCard 
                                            title="จำนวนคำร้องที่สร้าง" 
                                            value={stats.requestsCreated} 
                                            icon={<EditNoteIcon />}
                                            color="primary.main"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <StatCard 
                                            title="จำนวนครั้งที่ดำเนินการ" 
                                            value={stats.actionsTaken} 
                                            icon={<CheckCircleOutlineIcon />}
                                            color="success.main"
                                        />
                                    </Grid>
                                </Grid>
                            )
                        )}
                    </CardContent>
                </Card>
                {/* --- END: Stats Section --- */}

                <Card variant="outlined" sx={{ borderRadius: 4 }}>
                     <CardHeader
                        avatar={<Avatar sx={{bgcolor: 'primary.main'}}><VpnKeyIcon /></Avatar>}
                        title={<Typography variant="h5" sx={{fontWeight: 'bold'}}>เปลี่ยนรหัสผ่าน</Typography>}
                    />
                    <CardContent>
                        <Box component="form" onSubmit={handleSubmit}>
                            <Stack spacing={3}>
                                {apiError && <Alert severity="error" sx={{borderRadius: 2}}>{apiError}</Alert>}
                                {success && <Alert severity="success" sx={{borderRadius: 2}}>{success}</Alert>}
                                <TextField
                                    type="password"
                                    name="oldPassword"
                                    label="รหัสผ่านเดิม"
                                    value={formData.oldPassword}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    error={!!formErrors.oldPassword}
                                    helperText={formErrors.oldPassword}
                                />
                                <TextField
                                    type="password"
                                    name="newPassword"
                                    label="รหัสผ่านใหม่"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    error={!!formErrors.newPassword}
                                    helperText={formErrors.newPassword || "ต้องมีอย่างน้อย 6 ตัวอักษร"}
                                />
                                <TextField
                                    type="password"
                                    name="confirmPassword"
                                    label="ยืนยันรหัสผ่านใหม่"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    error={!!formErrors.confirmPassword}
                                    helperText={formErrors.confirmPassword}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button 
                                        type="submit" 
                                        variant="contained" 
                                        disabled={loading}
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                    >
                                        {loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                                    </Button>
                                </Box>
                            </Stack>
                        </Box>
                    </CardContent>
                </Card>
            </Stack>
        </Box>
    );
};

export default ProfilePage;