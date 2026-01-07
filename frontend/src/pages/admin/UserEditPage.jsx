// frontend/src/pages/admin/UserEditPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Stack, Typography, Grid, TextField, Button, CircularProgress,
    FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
    FormGroup, Box, Checkbox, Card, CardHeader, CardContent, Avatar, Alert,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider
} from '@mui/material';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import { motion } from 'framer-motion';

// Icons
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SaveIcon from '@mui/icons-material/Save';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import LockResetIcon from '@mui/icons-material/LockReset';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const UserEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const notification = useNotification();
    
    // State for data
    const [user, setUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState([]);
    const [userSpecialRoles, setUserSpecialRoles] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [allSpecialRoles, setAllSpecialRoles] = useState([]);
    const [allRoles, setAllRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    // State for password reset
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    // State for new layout
    const [currentView, setCurrentView] = useState('general'); // 'general', 'permissions', 'special_roles', 'reset_password'

    useEffect(() => {
        // ... (ส่วนการดึงข้อมูลยังคงเหมือนเดิมทุกประการ)
        if (!id) {
            setLoading(false);
            return;
        }

        Promise.all([
            adminService.getUserById(id),
            adminService.getCategories(),
            adminService.getDepartments(),
            adminService.getUserPermissions(id),
            adminService.getSpecialRoles(),
            adminService.getSpecialRolesForUser(id),
            adminService.getRoles(),
        ]).then(([userRes, catRes, deptRes, permRes, allSRolesRes, userSRolesRes, allRolesRes]) => {
            setUser(userRes.data);
            setAllCategories(catRes.data);
            setAllDepartments(deptRes.data);
            setUserPermissions(permRes.data);
            setAllSpecialRoles(allSRolesRes.data);
            setUserSpecialRoles(userSRolesRes.data);
            setAllRoles(allRolesRes.data);
        }).catch(err => {
            console.error(err);
            notification.showNotification('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', 'error');
        }).finally(() => {
            setLoading(false);
        });
    }, [id, notification]);

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        setUser(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    const handlePermissionChange = (e) => {
        const categoryId = parseInt(e.target.value, 10);
        const isChecked = e.target.checked;
        setUserPermissions(prev => isChecked ? [...prev, categoryId] : prev.filter(id => id !== categoryId));
    };
    const handleSpecialRoleChange = (e) => {
        const roleId = parseInt(e.target.value, 10);
        const isChecked = e.target.checked;
        setUserSpecialRoles(prev => isChecked ? [...prev, roleId] : prev.filter(id => id !== roleId));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToUpdate = { 
            FullName: user.FullName, Email: user.Email, DepartmentID: user.DepartmentID || null,
            Position: user.Position, RoleID: user.RoleID, IsActive: user.IsActive,
            categoryPermissions: userPermissions, specialRoleIds: userSpecialRoles
        };
        adminService.updateUser(id, dataToUpdate)
            .then(() => {
                notification.showNotification('อัปเดตข้อมูลผู้ใช้สำเร็จ!', 'success');
                navigate('/admin/users');
            })
            .catch(err => notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปเดต', 'error'));
    };
    
    const handlePasswordReset = async () => {
         if (!password || password.length < 6) {
            notification.showNotification('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 'warning');
            return;
        }
        if (password !== confirmPassword) {
            notification.showNotification('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', 'warning');
            return;
        }
        setIsResetting(true);
        try {
            await adminService.resetUserPassword(id, password);
            notification.showNotification(`รีเซ็ตรหัสผ่านสำหรับ ${user.Username} สำเร็จ!`, 'success');
            setPassword(''); setConfirmPassword(''); setCurrentView('general'); // กลับไปหน้าหลักหลังรีเซ็ต
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน', 'error');
        } finally {
            setIsResetting(false);
        }
    };
    
    // --- Render Logic ---
    if (loading) return <Box sx={{display: 'flex', justifyContent: 'center', mt: 4}}><CircularProgress /></Box>;
    if (!user) return <Typography>ไม่พบข้อมูลผู้ใช้</Typography>;

    const renderContent = () => {
        switch(currentView) {
            case 'general':
                return (
                    <Card variant="outlined">
                        <CardHeader title="ข้อมูลทั่วไป" />
                        <CardContent>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}><TextField name="FullName" label="ชื่อ-นามสกุล" value={user.FullName} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} md={6}><TextField name="Email" label="อีเมล" type="email" value={user.Email || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth  style={{width:'100px'}}>
                                        <InputLabel>แผนก</InputLabel>
                                        <Select name="DepartmentID" label="แผนก" value={user.DepartmentID || ''} onChange={handleChange}>
                                            <MenuItem value=""><em>ไม่ระบุ</em></MenuItem>
                                            {allDepartments.map(dept => (<MenuItem key={dept.DepartmentID} value={dept.DepartmentID}>{dept.DepartmentName}</MenuItem>))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}><TextField name="Position" label="ตำแหน่ง" value={user.Position || ''} onChange={handleChange} fullWidth /></Grid>
                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel>บทบาทหลัก (Main Role)</InputLabel>
                                        <Select name="RoleID" label="บทบาทหลัก (Main Role)" value={user.RoleID || ''} onChange={handleChange}>
                                            {allRoles.map(role => (<MenuItem key={role.RoleID} value={role.RoleID}>{role.Description} ({role.RoleName})</MenuItem>))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}><FormControlLabel control={<Switch name="IsActive" checked={!!user.IsActive} onChange={handleChange} />} label={user.IsActive ? "สถานะ: เปิดใช้งาน" : "สถานะ: ปิดใช้งาน"} /></Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                );
            case 'permissions':
                 return (
                    <Card variant="outlined">
                        <CardHeader title="สิทธิ์การเข้าถึงหมวดหมู่" subheader="กำหนดว่าผู้ใช้นี้จะสามารถสร้าง/เห็นคำร้องในหมวดหมู่ใดได้บ้าง" />
                        <CardContent><FormGroup><Grid container spacing={1}>{allCategories.map(category => (<Grid item xs={12} sm={6} md={4} key={category.CategoryID}><FormControlLabel control={<Checkbox value={category.CategoryID} checked={userPermissions.includes(category.CategoryID)} onChange={handlePermissionChange} />} label={category.CategoryName} /></Grid>))}</Grid></FormGroup></CardContent>
                    </Card>
                 );
            case 'special_roles':
                 return (
                    <Card variant="outlined">
                        <CardHeader title="บทบาทพิเศษ (Special Roles)" subheader="กำหนดบทบาทเฉพาะทางที่นอกเหนือจากบทบาทหลัก" />
                        <CardContent><FormGroup><Grid container spacing={1}>{allSpecialRoles.map(role => (<Grid item xs={12} sm={6} md={4} key={role.RoleID}><FormControlLabel control={<Checkbox value={role.RoleID} checked={userSpecialRoles.includes(role.RoleID)} onChange={handleSpecialRoleChange} />} label={role.RoleName} /></Grid>))}</Grid></FormGroup></CardContent>
                    </Card>
                 );
            case 'reset_password':
                 return (
                     <Card variant="outlined">
                        <CardHeader title="รีเซ็ตรหัสผ่าน" subheader="กำหนดรหัสผ่านใหม่ให้ผู้ใช้ในกรณีที่ลืมรหัสผ่าน" />
                        <CardContent>
                            <Stack spacing={3}>
                                <TextField type="password" label="รหัสผ่านใหม่" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth helperText="ต้องมีอย่างน้อย 6 ตัวอักษร" />
                                <TextField type="password" label="ยืนยันรหัสผ่านใหม่" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button variant="contained" color="secondary" onClick={handlePasswordReset} disabled={isResetting || !password} startIcon={isResetting ? <CircularProgress size={20} color="inherit" /> : <LockResetIcon />}>
                                        {isResetting ? 'กำลังรีเซ็ต...' : 'ยืนยันการรีเซ็ตรหัสผ่าน'}
                                    </Button>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                 );
            default: return null;
        }
    }

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>แก้ไขผู้ใช้</Typography>
                    <Typography color="text.secondary">จัดการข้อมูลและสิทธิ์สำหรับ {user.Username}</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/users')}>
                        กลับ
                    </Button>
                    <Button variant="contained" onClick={handleSubmit} size="large" startIcon={<SaveIcon />}>
                        บันทึกข้อมูลทั้งหมด
                    </Button>
                </Stack>
            </Stack>

            <Grid container spacing={4}>
                {/* Left Column: Profile & Menu */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={3}>
                        <Card sx={{ textAlign: 'center', p: 2 }}>
                            <Avatar sx={{ width: 80, height: 80, margin: 'auto', mb: 2, fontSize: '2.5rem' }}>
                                {user.FullName.charAt(0)}
                            </Avatar>
                            <Typography variant="h6">{user.FullName}</Typography>
                            <Typography color="text.secondary">{user.Email}</Typography>
                        </Card>
                        <Card>
                            <List>
                                <ListItemButton selected={currentView === 'general'} onClick={() => setCurrentView('general')}>
                                    <ListItemIcon><AccountCircleIcon /></ListItemIcon>
                                    <ListItemText primary="ข้อมูลทั่วไป" />
                                </ListItemButton>
                                <ListItemButton selected={currentView === 'permissions'} onClick={() => setCurrentView('permissions')}>
                                    <ListItemIcon><VpnKeyIcon /></ListItemIcon>
                                    <ListItemText primary="สิทธิ์การเข้าถึง" />
                                </ListItemButton>
                                <ListItemButton selected={currentView === 'special_roles'} onClick={() => setCurrentView('special_roles')}>
                                    <ListItemIcon><HowToRegIcon /></ListItemIcon>
                                    <ListItemText primary="บทบาทพิเศษ" />
                                </ListItemButton>
                                <Divider sx={{ my: 1 }} />
                                <ListItemButton selected={currentView === 'reset_password'} onClick={() => setCurrentView('reset_password')}>
                                    <ListItemIcon><LockResetIcon /></ListItemIcon>
                                    <ListItemText primary="รีเซ็ตรหัสผ่าน" />
                                </ListItemButton>
                            </List>
                        </Card>
                    </Stack>
                </Grid>

                {/* Right Column: Content */}
                <Grid item xs={12} md={8}>
                    <motion.div
                        key={currentView}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {renderContent()}
                    </motion.div>
                </Grid>
            </Grid>
        </Box>
    );
};

export default UserEditPage;