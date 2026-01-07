// frontend/src/pages/admin/UserCreatePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
    Stack, Typography, Grid, TextField, Button, FormControl,
    InputLabel, Select, MenuItem, FormGroup, FormControlLabel,
    Checkbox, Box, Card, CardHeader, CardContent, Avatar, Alert
} from '@mui/material';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SaveIcon from '@mui/icons-material/Save';

const UserCreatePage = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    
    const { register, handleSubmit, control, formState: { errors: formErrors }, setValue } = useForm({
        defaultValues: {
            username: '',
            password: '',
            fullName: '',
            email: '',
            departmentId: '',
            position: '',
            phoneNumber: '',
            roleId: ''
        }
    });

    const [allCategories, setAllCategories] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [allRoles, setAllRoles] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        Promise.all([
            adminService.getCategories(),
            adminService.getDepartments(),
            adminService.getRoles(),
        ]).then(([catRes, deptRes, rolesRes]) => {
            setAllCategories(catRes.data);
            setAllDepartments(deptRes.data);
            setAllRoles(rolesRes.data);
            const requesterRole = rolesRes.data.find(r => r.RoleName === 'Requester');
            if (requesterRole) {
                setValue('roleId', requesterRole.RoleID);
            }
        }).catch(err => console.error("Could not fetch master data", err));
    }, [setValue]);

    const handlePermissionChange = (e) => {
        const categoryId = parseInt(e.target.value, 10);
        const isChecked = e.target.checked;
        setSelectedPermissions(prev =>
            isChecked ? [...prev, categoryId] : prev.filter(id => id !== categoryId)
        );
    };

    const onSubmit = (data) => {
        setApiError('');

        const dataToSubmit = {
            ...data,
            departmentId: data.departmentId || null,
            categoryPermissions: selectedPermissions
        };

        adminService.createUser(dataToSubmit)
            .then(() => {
                notification.showNotification('สร้างผู้ใช้ใหม่สำเร็จ!', 'success');
                navigate('/admin/users');
            })
            .catch(err => {
                const message = err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้';
                notification.showNotification(message, 'error');
                setApiError(message);
            });
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>สร้างผู้ใช้ใหม่</Typography>
            {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
            <Stack spacing={4}>
                <Card variant="outlined">
                    <CardHeader
                        avatar={<Avatar><AccountCircleIcon /></Avatar>}
                        title="ข้อมูลผู้ใช้"
                        subheader="กรอกข้อมูลส่วนตัวและข้อมูลเข้าระบบ"
                    />
                    <CardContent>
                        {/* ===== 💡 START: ปรับสัดส่วน Grid ใหม่เพื่อความยืดหยุ่น 💡 ===== */}
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Username"
                                    fullWidth
                                    required
                                    {...register('username', { required: 'กรุณากรอก Username' })}
                                    error={!!formErrors.username}
                                    helperText={formErrors.username?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="password"
                                    label="รหัสผ่าน"
                                    fullWidth
                                    required
                                    {...register('password', {
                                        required: 'กรุณากรอกรหัสผ่าน',
                                        minLength: { value: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }
                                    })}
                                    error={!!formErrors.password}
                                    helperText={formErrors.password?.message || "ต้องมีอย่างน้อย 6 ตัวอักษร"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="ชื่อ-นามสกุล"
                                    fullWidth
                                    required
                                    {...register('fullName', { required: 'กรุณากรอกชื่อ-นามสกุล' })}
                                    error={!!formErrors.fullName}
                                    helperText={formErrors.fullName?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="email"
                                    label="อีเมล"
                                    fullWidth
                                    {...register('email', {
                                        pattern: { value: /\S+@\S+\.\S+/, message: 'รูปแบบอีเมลไม่ถูกต้อง' }
                                    })}
                                    error={!!formErrors.email}
                                    helperText={formErrors.email?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth style={{width:'100px'}}>
                                    <InputLabel>แผนก</InputLabel>
                                    <Controller
                                        name="departmentId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select {...field} label="แผนก">
                                                <MenuItem value=""><em>ไม่ระบุ</em></MenuItem>
                                                {allDepartments.map(dept => (
                                                    <MenuItem key={dept.DepartmentID} value={dept.DepartmentID}>
                                                        {dept.DepartmentName}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        )}
                                    />
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField label="ตำแหน่ง" fullWidth {...register('position')} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField label="เบอร์โทรศัพท์" fullWidth {...register('phoneNumber')} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required error={!!formErrors.roleId}>
                                    <InputLabel>บทบาท (Role)</InputLabel>
                                    <Controller
                                        name="roleId"
                                        control={control}
                                        rules={{ required: 'กรุณาเลือก Role' }}
                                        render={({ field }) => (
                                            <Select {...field} label="บทบาท (Role)">
                                                {allRoles.map(role => (
                                                    <MenuItem key={role.RoleID} value={role.RoleID}>
                                                        {role.Description} ({role.RoleName})
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        )}
                                    />
                                    {formErrors.roleId && <Typography color="error" variant="caption" sx={{ pl: 2, pt: 0.5 }}>{formErrors.roleId.message}</Typography>}
                                </FormControl>
                            </Grid>
                        </Grid>
                        {/* ===== 🔥 END: ปรับสัดส่วน Grid ใหม่เพื่อความยืดหยุ่น 🔥 ===== */}
                    </CardContent>
                </Card>

                <Card variant="outlined">
                    <CardHeader
                        avatar={<Avatar><VpnKeyIcon /></Avatar>}
                        title="สิทธิ์การเข้าถึงหมวดหมู่"
                        subheader="กำหนดว่าผู้ใช้นี้จะสามารถสร้าง/เห็นคำร้องในหมวดหมู่ใดได้บ้าง"
                    />
                    <CardContent>
                        <FormGroup>
                            <Grid container spacing={1}>
                                {allCategories.map(category => (
                                    <Grid item xs={12} sm={6} md={4} key={category.CategoryID}>
                                        <FormControlLabel
                                            control={<Checkbox value={category.CategoryID} onChange={handlePermissionChange} />}
                                            label={category.CategoryName}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        </FormGroup>
                    </CardContent>
                </Card>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit" variant="contained" size="large" startIcon={<SaveIcon />}>
                        บันทึกผู้ใช้
                    </Button>
                </Box>
            </Stack>
        </Box>
    );
};

export default UserCreatePage;