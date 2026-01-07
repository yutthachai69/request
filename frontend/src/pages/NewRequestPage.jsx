// frontend/src/pages/NewRequestPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import requestService from '../services/requestService';
import { useNotification } from '../context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box, Typography, TextField, Button, FormControl, InputLabel, Select,
    MenuItem, CircularProgress, Alert, Paper, Divider, Stepper, Step,
    StepLabel, Stack, Avatar, FormGroup, FormControlLabel, Checkbox,
    RadioGroup, Radio, FormLabel, Card, CardHeader, CardContent, List, ListItem, ListItemText, Grid,
    Chip, Tabs, Tab
} from '@mui/material';
import api from '../services/api';
import AttachmentsManager from '../components/AttachmentsManager';

import { useAuth } from '../context/AuthContext';
import emailService from '../services/emailService';
import { getApprovalEmail } from '../helpers/emailTemplateHelper';

// Icons
import SendIcon from '@mui/icons-material/Send';

const STEPS = ['ข้อมูลทั่วไป', 'รายละเอียดและไฟล์แนบ', 'ตรวจสอบและส่ง'];

const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeInOut" } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3, ease: "easeInOut" } }
};

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && (<Box sx={{ pt: 3 }}>{children}</Box>)}
        </div>
    );
}

const NewRequestPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const notification = useNotification();
    const { user: currentUser } = useAuth();
    const queryParams = new URLSearchParams(location.search);
    const preselectedCategoryId = queryParams.get('category');

    const [activeStep, setActiveStep] = useState(0);
    const [activeDetailTab, setActiveDetailTab] = useState(0);
    const [masterData, setMasterData] = useState({ categories: [], locations: [], correctionTypes: [], correctionReasons: [] });
    const [filteredLocations, setFilteredLocations] = useState([]);
    const [formData, setFormData] = useState({
        requestDate: new Date().toISOString().split('T')[0],
        categoryId: preselectedCategoryId || '',
        locationId: '',
        reasonId: '',
        problemSystem: 'ERP SoftPRO',
        problemReason: ''
    });
    const [selectedTypeIds, setSelectedTypeIds] = useState([]);
    const [dynamicFieldValues, setDynamicFieldValues] = useState({});
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    // --- START: CREATE SEPARATE LOADING STATE FOR TYPES ---
    const [loadingTypes, setLoadingTypes] = useState(false);
    // --- END: CREATE SEPARATE LOADING STATE FOR TYPES ---

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [catRes, locRes, reasonRes] = await Promise.all([
                    api.get('/master/my-categories'),
                    api.get('/master/locations'),
                    api.get('/master/correction-reasons'),
                ]);
                
                setMasterData(prev => ({
                    ...prev,
                    categories: catRes.data,
                    locations: locRes.data,
                    correctionReasons: reasonRes.data,
                }));
                setFilteredLocations(locRes.data);

                if (preselectedCategoryId) {
                    setFormData(prev => ({ ...prev, categoryId: preselectedCategoryId }));
                }
                
            } catch (err) {
                setError('ไม่สามารถโหลดข้อมูล Master ได้');
                notification.showNotification('ไม่สามารถโหลดข้อมูล Master ได้', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [preselectedCategoryId, notification]);

    useEffect(() => {
        const categoryId = formData.categoryId;
        if (!categoryId) {
            setMasterData(prev => ({ ...prev, correctionTypes: [] }));
            setFilteredLocations(masterData.locations);
            return;
        }

        const selectedCategory = masterData.categories.find(c => c.CategoryID == categoryId);

        if (selectedCategory) {
            if (selectedCategory.CategoryName === 'ศูนย์ขนถ่าย') {
                api.get(`/master/locations?categoryId=${categoryId}`)
                    .then(res => {
                        setFilteredLocations(res.data);
                        if (res.data.length > 0 && !res.data.find(l => l.LocationID === formData.locationId)) {
                            setFormData(prev => ({ ...prev, locationId: '' }));
                        }
                    })
                    .catch(() => notification.showNotification('ไม่สามารถโหลดข้อมูลสถานที่ได้', 'error'));
            } else {
                const tusmLocation = masterData.locations.find(l => l.LocationName === 'TUSM');
                if (tusmLocation) {
                    setFormData(prev => ({ ...prev, locationId: tusmLocation.LocationID }));
                    setFilteredLocations([tusmLocation]);
                }
            }
        }
        
        // --- START: USE SEPARATE LOADING STATE ---
        setLoadingTypes(true);
        api.get(`/master/correction-types?categoryId=${categoryId}`)
            .then(res => {
                setMasterData(prev => ({ ...prev, correctionTypes: res.data }));
                setSelectedTypeIds([]);
                setDynamicFieldValues({});
            })
            .catch(err => notification.showNotification('ไม่สามารถโหลดประเภทการแก้ไขสำหรับหมวดหมู่นี้ได้', 'error'))
            .finally(() => setLoadingTypes(false));
        // --- END: USE SEPARATE LOADING STATE ---

    }, [formData.categoryId, masterData.categories, masterData.locations, notification]);


    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleTypeChange = (event) => {
        const { value, checked } = event.target;
        const id = parseInt(value, 10);
        if (!checked) {
            const currentIndex = selectedTypeIds.indexOf(id);
            if (currentIndex === activeDetailTab && selectedTypeIds.length > 1) setActiveDetailTab(0);
        }
        setSelectedTypeIds(prev => checked ? [...prev, id] : prev.filter(typeId => typeId !== id));
    };
    const handleDynamicFieldChange = (typeId, fieldIndex, value) => {
        setDynamicFieldValues(prev => ({ ...prev, [typeId]: { ...prev[typeId], [`val${fieldIndex + 1}`]: value } }));
    };
    
    const handleFilesChange = ({ action, file, files }) => {
        if (action === 'add') {
            setSelectedFiles(prev => [...prev, ...files]);
        } else if (action === 'delete') {
            setSelectedFiles(prev => Array.from(prev).filter(f => f.name !== file.name));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        const detailsArray = selectedTypeIds.map(typeId => {
            const typeConfig = masterData.correctionTypes.find(t => t.CorrectionTypeID === typeId);
            if (!typeConfig) return '';
            let template = typeConfig.TemplateString;
            const fieldValues = dynamicFieldValues[typeId] || {};
            const fields = JSON.parse(typeConfig.FieldsConfig || '[]');
            for (let i = 0; i < fields.length; i++) {
                const value = fieldValues[`val${i + 1}`] || '';
                template = template.replace(`{val${i + 1}}`, `(${value})`);
            }
            return template;
        });
        const finalProblemDetail = detailsArray.join('\n\n');
        
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        data.append('correctionTypeIds', JSON.stringify(selectedTypeIds));
        data.append('problemDetail', finalProblemDetail);
        for (const file of selectedFiles) { data.append('attachments', file); }

        try {
            const res = await requestService.createRequest(data);
            notification.showNotification('ยื่นคำร้องสำเร็จ!', 'success');
            
            const { nextApprovers, request } = res.data;
            if (nextApprovers && nextApprovers.length > 0) {
                const emails = nextApprovers.map(a => a.email).filter(Boolean);
                if (emails.length > 0) {
                    const requestData = {
                        requestId: request.RequestID,
                        requestNumber: request.RequestNumber || request.RequestID,
                        categoryName: masterData.categories.find(c => c.CategoryID == formData.categoryId)?.CategoryName || 'N/A',
                        requesterName: currentUser.fullName
                    };
                    const { subject, body } = getApprovalEmail(requestData);
                    emailService.sendEmail({ to: emails, subject, body })
                        .catch(err => notification.showNotification('ไม่สามารถส่งอีเมลหาผู้อนุมัติได้', 'error'));
                }
            }
            
            navigate(`/category/${formData.categoryId}`);

        } catch (err) {
            const message = err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างคำร้อง';
            notification.showNotification(message, 'error');
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = () => {
        if (activeStep === 0) {
            if (!formData.categoryId || !formData.reasonId || !formData.locationId) {
                notification.showNotification('กรุณากรอกข้อมูลใน Step 1 ให้ครบถ้วน (หมวดหมู่, สถานที่, เหตุผล)', 'warning');
                return;
            }
        }
        if (activeStep === 1) {
             if (selectedTypeIds.length === 0) {
                notification.showNotification('กรุณาเลือกประเภทการแก้ไขอย่างน้อย 1 รายการ', 'warning');
                return;
            }
            for (const typeId of selectedTypeIds) {
                const typeConfig = masterData.correctionTypes.find(t => t.CorrectionTypeID === typeId);
                if (!typeConfig) continue;

                const fields = JSON.parse(typeConfig.FieldsConfig || '[]');
                const fieldValues = dynamicFieldValues[typeId] || {};

                for (let i = 0; i < fields.length; i++) {
                    const field = fields[i];
                    if (field.required) {
                        const value = fieldValues[`val${i + 1}`] || '';
                        if (!value.trim()) {
                            notification.showNotification(`กรุณากรอกข้อมูลสำหรับ "${typeConfig.CorrectionTypeName}" ในช่อง "${field.label}"`, 'error');
                            return;
                        }
                    }
                }
            }
        }
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => setActiveStep((prev) => prev - 1);

    const renderStepContent = (step) => {
        const selectedCategory = masterData.categories.find(c => c.CategoryID == formData.categoryId);
        const isCenterCategory = selectedCategory?.CategoryName === 'ศูนย์ขนถ่าย';

        switch (step) {
            case 0:
                return (
                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardHeader title="1. ข้อมูลทั่วไป" />
                        <CardContent>
                            <Stack spacing={3}>
                                <FormControl fullWidth required>
                                    <InputLabel>หมวดหมู่</InputLabel>
                                    <Select name="categoryId" value={formData.categoryId} label="หมวดหมู่" onChange={handleChange} disabled={!!preselectedCategoryId}>
                                        {masterData.categories.map(cat => <MenuItem key={cat.CategoryID} value={cat.CategoryID}>{cat.CategoryName}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                
                                <FormControl fullWidth required>
                                    <InputLabel>สถานที่/ศูนย์ขนถ่าย</InputLabel>
                                    <Select 
                                        name="locationId" 
                                        value={formData.locationId} 
                                        label="สถานที่/ศูนย์ขนถ่าย" 
                                        onChange={handleChange}
                                        disabled={!!formData.categoryId && !isCenterCategory}
                                    >
                                        {filteredLocations.map(loc => <MenuItem key={loc.LocationID} value={loc.LocationID}>{loc.LocationName}</MenuItem>)}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth required>
                                    <InputLabel>เหตุผลการแก้ไข</InputLabel>
                                    <Select name="reasonId" value={formData.reasonId} label="เหตุผลการแก้ไข" onChange={handleChange}>
                                        {masterData.correctionReasons.map(r => <MenuItem key={r.ReasonID} value={r.ReasonID}>{r.ReasonText}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <FormControl required>
                                    <FormLabel>ระบบที่ขอแก้ไข</FormLabel>
                                    <RadioGroup row name="problemSystem" value={formData.problemSystem} onChange={handleChange}>
                                        <FormControlLabel value="ERP SoftPRO" control={<Radio />} label="ERP SoftPRO" />
                                        <FormControlLabel value="อื่นๆ" control={<Radio />} label="อื่นๆ" />
                                    </RadioGroup>
                                </FormControl>
                                {formData.problemSystem === 'อื่นๆ' && (
                                    <TextField name="problemReason" label="ระบุระบบอื่นๆ" fullWidth value={formData.problemReason} onChange={handleChange} required />
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                );
            case 1:
                return (
                    <Box>
                        <Card variant="outlined" sx={{ borderRadius: 3 }}>
                            <CardHeader title="2. ระบุรายละเอียดการแก้ไข" subheader="เลือกประเภททางซ้าย และกรอกข้อมูลทางขวา" />
                            <CardContent>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={5}>
                                        <Paper variant='outlined' sx={{ p: 1, minHeight: 150, maxHeight: 350, overflowY: 'auto' }}>
                                            {/* --- START: ADD LOADING INDICATOR --- */}
                                            {loadingTypes ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
                                                    <CircularProgress size={24} />
                                                </Box>
                                            ) : (
                                                <FormGroup>
                                                    {masterData.correctionTypes.map(type => (
                                                        <FormControlLabel 
                                                            key={type.CorrectionTypeID} 
                                                            control={
                                                                <Checkbox 
                                                                    value={type.CorrectionTypeID} 
                                                                    onChange={handleTypeChange} 
                                                                    checked={selectedTypeIds.includes(type.CorrectionTypeID)}
                                                                    disabled={loadingTypes} // Disable while loading
                                                                />
                                                            } 
                                                            label={type.CorrectionTypeName} 
                                                        />
                                                    ))}
                                                </FormGroup>
                                            )}
                                            {/* --- END: ADD LOADING INDICATOR --- */}
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} md={7}>
                                        {selectedTypeIds.length > 0 ? (
                                            <Box>
                                                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                                    <Tabs value={activeDetailTab} onChange={(e, val) => setActiveDetailTab(val)} variant="scrollable">
                                                        {selectedTypeIds.map(id => {
                                                            const type = masterData.correctionTypes.find(t => t.CorrectionTypeID === id);
                                                            return <Tab label={type?.CorrectionTypeName || '...'} key={id} />;
                                                        })}
                                                    </Tabs>
                                                </Box>
                                                {selectedTypeIds.map((id, index) => {
                                                    const type = masterData.correctionTypes.find(t => t.CorrectionTypeID === id);
                                                    const fields = type ? JSON.parse(type.FieldsConfig || '[]') : [];
                                                    return (
                                                        <TabPanel value={activeDetailTab} index={index} key={id}>
                                                            <Stack spacing={2}>
                                                                {fields.map((field, fIndex) => (
                                                                    <TextField 
                                                                        key={fIndex} 
                                                                        label={field.label} 
                                                                        required={field.required} 
                                                                        fullWidth 
                                                                        size="small"
                                                                        value={dynamicFieldValues[id]?.[`val${fIndex + 1}`] || ''}
                                                                        onChange={(e) => handleDynamicFieldChange(id, fIndex, e.target.value)}
                                                                        multiline={field.type === 'textarea'}
                                                                        minRows={field.type === 'textarea' ? 3 : 1}
                                                                        maxRows={field.type === 'textarea' ? 10 : 1}
                                                                    />
                                                                ))}
                                                            </Stack>
                                                        </TabPanel>
                                                    )
                                                })}
                                            </Box>
                                        ) : (
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}>
                                                <Typography color="text.secondary">กรุณาเลือกประเภทการแก้ไข</Typography>
                                            </Box>
                                        )}
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                        
                        <Box mt={4}>
                            <AttachmentsManager
                                existingFiles={selectedFiles}
                                onFilesChange={handleFilesChange}
                            />
                        </Box>
                    </Box>
                );
            case 2:
                 return (
                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardHeader title="3. ตรวจสอบข้อมูลทั้งหมด" />
                        <CardContent>
                            <Stack spacing={3} divider={<Divider />}>
                                <Box>
                                    <Typography variant="h6" gutterBottom>ข้อมูลทั่วไป</Typography>
                                    <List dense>
                                        <ListItem><ListItemText primary="หมวดหมู่:" secondary={masterData.categories.find(c=>c.CategoryID == formData.categoryId)?.CategoryName || '—'} /></ListItem>
                                        <ListItem><ListItemText primary="สถานที่/ศูนย์ขนถ่าย:" secondary={masterData.locations.find(l=>l.LocationID == formData.locationId)?.LocationName || '—'} /></ListItem>
                                        <ListItem><ListItemText primary="เหตุผล:" secondary={masterData.correctionReasons.find(r=>r.ReasonID == formData.reasonId)?.ReasonText || '—'} /></ListItem>
                                        <ListItem><ListItemText primary="ระบบ:" secondary={formData.problemSystem === 'อื่นๆ' ? formData.problemReason : formData.problemSystem} /></ListItem>
                                    </List>
                                </Box>
                                <Box>
                                    <Typography variant="h6" gutterBottom>รายละเอียดการแก้ไข</Typography>
                                    {selectedTypeIds.map(typeId => {
                                        const type = masterData.correctionTypes.find(t => t.CorrectionTypeID === typeId);
                                        if (!type) return null;
                                        const fields = JSON.parse(type.FieldsConfig || '[]');
                                        const values = dynamicFieldValues[typeId] || {};
                                        return (
                                            <Box key={typeId} sx={{mb: 2}}>
                                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{type.CorrectionTypeName}</Typography>
                                                <List dense disablePadding sx={{pl: 2}}>
                                                    {fields.map((field, index) => (
                                                        <ListItem key={index} disableGutters>
                                                            <ListItemText primary={`${field.label}:`} secondary={values[`val${index + 1}`] || <em style={{color: 'grey'}}>ไม่ได้กรอก</em>} />
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            </Box>
                                        )
                                    })}
                                </Box>
                                <Box>
                                    <Typography variant="h6" gutterBottom>ไฟล์แนบ</Typography>
                                    {selectedFiles.length > 0 ? (
                                        Array.from(selectedFiles).map(file => (
                                            <Chip key={file.name} label={file.name} sx={{mr: 1, mb: 1}} />
                                        ))
                                     ) : (
                                        <Typography variant="body2" color="text.secondary">ไม่มีไฟล์แนบ</Typography>
                                     )}
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                );
            default:
                return 'Unknown Step';
        }
    }

    if (loading) return <Box sx={{display: 'flex', justifyContent: 'center', mt: 4}}><CircularProgress /></Box>;
    
    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: '1000px', mx: 'auto' }}>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>สร้างคำร้องใหม่</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>กรอกข้อมูลตามขั้นตอนเพื่อส่งคำร้องขอแก้ไขข้อมูล</Typography>

            <Paper sx={{ p: {xs: 2, md: 4}, borderRadius: 4 }} variant="outlined">
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {STEPS.map((label) => (
                        <Step key={label}><StepLabel>{label}</StepLabel></Step>
                    ))}
                </Stepper>
                
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeStep}
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {renderStepContent(activeStep)}
                    </motion.div>
                </AnimatePresence>
            </Paper>
            
            {error && <Alert severity="error" sx={{mt: 2}}>{error}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button color="inherit" disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
                    ย้อนกลับ
                </Button>
                
                {activeStep < STEPS.length - 1 ? (
                    <Button variant="contained" onClick={handleNext}>
                        ถัดไป
                    </Button>
                ) : (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button type="submit" variant="contained" color="success" size="large"
                            startIcon={isSubmitting ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'กำลังยื่นคำร้อง...' : 'ยื่นคำร้อง'}
                        </Button>
                    </motion.div>
                )}
            </Box>
        </Box>
    );
};

export default NewRequestPage;