// frontend/src/pages/RequestEditPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import requestService from '../services/requestService';
import { useNotification } from '../context/NotificationContext';
import {
    Box, Paper, Typography, Button, CircularProgress, Alert, Divider, Stack,
    Card, CardContent, Grid, FormGroup, FormControlLabel, Checkbox, CardHeader, Avatar, Chip,
    Tabs, Tab, TextField
} from '@mui/material';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot, timelineItemClasses } from '@mui/lab';
import api from '../services/api';
import AttachmentsManager from '../components/AttachmentsManager';

import emailService from '../services/emailService';
import { getApprovalEmail } from '../helpers/emailTemplateHelper';

// --- Icons ---
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && (<Box sx={{ pt: 2 }}>{children}</Box>)}
        </div>
    );
}

const WorkflowPreview = ({ categoryId, correctionTypeIds }) => {
    const [steps, setSteps] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!categoryId) { setSteps([]); return; }
        setLoading(true);
        const typeIds = Array.isArray(correctionTypeIds) ? correctionTypeIds : [];
        requestService.getWorkflowPreview({ categoryId, correctionTypeIds: typeIds.join(',') })
            .then(res => setSteps(res.data))
            .catch(err => console.error("Failed to fetch workflow preview", err))
            .finally(() => setLoading(false));
    }, [categoryId, correctionTypeIds]);

    if (loading) return <CircularProgress size={24} />;

    return steps.length > 0 ? (
        <Timeline sx={{ p: 0, [`& .${timelineItemClasses.root}:before`]: { flex: 0, padding: 0 } }}>
            {steps.map((step, index) => (
                <TimelineItem key={index}>
                    <TimelineSeparator>
                        <TimelineDot color="primary"><CheckCircleIcon fontSize="small" /></TimelineDot>
                        {index < steps.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                        <Typography variant="body1" component="span">{step.ApproverRoleName}</Typography>
                    </TimelineContent>
                </TimelineItem>
            ))}
        </Timeline>
    ) : (<Typography variant="body2" color="text.secondary">No workflow defined.</Typography>);
};

const RequestEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const notification = useNotification();
    
    const [formData, setFormData] = useState(null);
    const [allCorrectionTypes, setAllCorrectionTypes] = useState([]);
    const [selectedTypeIds, setSelectedTypeIds] = useState([]);
    const [dynamicFieldValues, setDynamicFieldValues] = useState({});
    
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [newFiles, setNewFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    const parseProblemDetail = useCallback((problemDetail, selectedIds, allTypes) => {
        const initialValues = {};
        if (!problemDetail || !selectedIds || !allTypes) return initialValues;
        const detailLines = problemDetail.split('\n\n');
        const selectedTypesMap = selectedIds.reduce((acc, typeId) => {
            const type = allTypes.find(t => t.CorrectionTypeID === typeId);
            if (type) acc[typeId] = type;
            return acc;
        }, {});

        detailLines.forEach(line => {
            let matched = false;
            for (const typeId of selectedIds) {
                const typeConfig = selectedTypesMap[typeId];
                if (!typeConfig || !typeConfig.TemplateString) continue;
                const escapedTemplate = typeConfig.TemplateString.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
                const valueCaptureRegex = /\\{val\d+\\}/g;
                const regexPatternString = "^" + escapedTemplate.replace(valueCaptureRegex, '(.*?)').trim() + "$";
                const regex = new RegExp(regexPatternString);
                const matches = line.trim().match(regex);
                if (matches) {
                    const values = {};
                    for (let i = 1; i < matches.length; i++) {
                        const capturedValue = matches[i].trim();
                        values[`val${i}`] = (capturedValue.startsWith('(') && capturedValue.endsWith(')'))
                            ? capturedValue.substring(1, capturedValue.length - 1)
                            : capturedValue;
                    }
                    initialValues[typeConfig.CorrectionTypeID] = values;
                    matched = true;
                    break;
                }
            }
        });
        return initialValues;
    }, []);

    useEffect(() => {
        if (!id) { setLoading(false); setError('Invalid Request ID'); return; }

        Promise.all([
            requestService.getRequestById(id),
            requestService.getRequestCorrectionTypes(id),
            // Fetch all types for the category to allow user to add more
            requestService.getRequestById(id).then(reqRes =>
                api.get(`/master/correction-types?categoryId=${reqRes.data.request.CategoryID}`)
            ),
        ]).then(([reqRes, typesRes, allTypesRes]) => {
            const requestData = reqRes.data.request;
            const selectedIds = typesRes.data.map(t => t.CorrectionTypeID);
            
            setFormData(requestData);
            setSelectedTypeIds(selectedIds);
            setAllCorrectionTypes(allTypesRes.data); // All types available for this category
            const parsedValues = parseProblemDetail(requestData.ProblemDetail, selectedIds, allTypesRes.data);
            setDynamicFieldValues(parsedValues);
            if (requestData.AttachmentPath && Array.isArray(requestData.AttachmentPath)) {
                setExistingAttachments(requestData.AttachmentPath);
            }
        }).catch((err) => {
            setError("Could not load request data.");
        }).finally(() => { setLoading(false); });
    }, [id, parseProblemDetail]);
    
    const handleTabChange = (event, newValue) => setActiveTab(newValue);
    const handleTypeChange = (event) => {
        const { value, checked } = event.target;
        const id = parseInt(value, 10);
        const newSelectedTypeIds = checked ? [...selectedTypeIds, id] : selectedTypeIds.filter(typeId => typeId !== id);
        setSelectedTypeIds(newSelectedTypeIds);
        if (activeTab >= newSelectedTypeIds.length) setActiveTab(Math.max(0, newSelectedTypeIds.length - 1));
    };
    const handleDynamicFieldChange = (typeId, fieldIndex, value) => {
        setDynamicFieldValues(prev => ({...prev, [typeId]: {...(prev[typeId] || {}), [`val${fieldIndex + 1}`]: value }}));
    };

    const handleFilesChange = ({ action, file, files }) => {
        if (action === 'add') {
            setNewFiles(prev => [...prev, ...files]);
        } else if (action === 'delete') {
            if (typeof file === 'string') {
                setExistingAttachments(prev => prev.filter(path => path !== file));
            } else {
                setNewFiles(prev => Array.from(prev).filter(f => f.name !== file.name));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedTypeIds.length === 0) {
            notification.showNotification('กรุณาเลือกประเภทการแก้ไขอย่างน้อย 1 รายการ', 'error');
            return;
        }

        const detailsArray = [];

        // --- START: ADDED VALIDATION for required fields ---
        for (const typeId of selectedTypeIds) {
            const typeConfig = allCorrectionTypes.find(t => t.CorrectionTypeID === typeId);
            if (!typeConfig) continue;
            
            const fields = JSON.parse(typeConfig.FieldsConfig || '[]');
            const fieldValues = dynamicFieldValues[typeId] || {};
            
            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                if (field.required) {
                    const value = fieldValues[`val${i + 1}`] || '';
                    if (!value.trim()) {
                        notification.showNotification(`กรุณากรอกข้อมูลสำหรับ "${typeConfig.CorrectionTypeName}" ในช่อง "${field.label}"`, 'error');
                        return; // Stop submission
                    }
                }
            }
            
            // Reconstruct the problem detail string
            let template = typeConfig.TemplateString;
            for (let i = 0; i < fields.length; i++) {
                const value = fieldValues[`val${i + 1}`] || '';
                template = template.replace(`{val${i + 1}}`, `(${value})`);
            }
            detailsArray.push(template);
        }
        // --- END: ADDED VALIDATION for required fields ---

        const finalProblemDetail = detailsArray.join('\n\n');

        const data = new FormData();
        data.append('ProblemDetail', finalProblemDetail);
        data.append('existingAttachments', JSON.stringify(existingAttachments));
        data.append('correctionTypeIds', JSON.stringify(selectedTypeIds));
        if (newFiles.length > 0) {
            for (let i = 0; i < newFiles.length; i++) {
                data.append('attachments', newFiles[i]);
            }
        }

        try {
            setIsSubmitting(true);
            const res = await requestService.updateRequest(id, data);
            notification.showNotification('อัปเดตคำร้องสำเร็จ!', 'success');

            const { nextApprovers } = res.data;
            if (nextApprovers && nextApprovers.length > 0) {
                const emails = nextApprovers.map(a => a.email).filter(Boolean);
                if (emails.length > 0) {
                    const requestData = {
                        requestId: id,
                        requestNumber: formData.RequestNumber || id,
                        categoryName: formData.CategoryName,
                        requesterName: formData.RequesterFullName
                    };
                    const { subject, body } = getApprovalEmail(requestData);
                    emailService.sendEmail({ to: emails, subject, body })
                        .catch(err => notification.showNotification('ไม่สามารถส่งอีเมลหาผู้อนุมัติได้', 'error'));
                }
            }

            navigate(`/request/${id}`);
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปเดต', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <Box sx={{display: 'flex', justifyContent: 'center', mt: 4}}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!formData) return <Typography>Request not found.</Typography>;
    
    const canBeEdited = ['PENDING_HOD', 'REVISION_REQUIRED'].includes(formData.StatusCode);

    if (!canBeEdited) {
        return <Alert severity="warning">This request cannot be edited because its status is '{formData.StatusName}'.</Alert>;
    }

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    แก้ไขคำร้อง #{formData.RequestNumber || id}
                </Typography>
                <Stack direction="row" spacing={2}>
                    <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
                        ย้อนกลับ
                    </Button>
                    <Button type="submit" variant="contained" startIcon={isSubmitting ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />} disabled={isSubmitting}>
                        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                    </Button>
                </Stack>
            </Box>

            <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderRadius: 4 }}>
                <Grid container spacing={4}>
                    <Grid item xs={12} md={8}>
                        <Stack spacing={4}>
                            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardHeader title="อัปเดตรายละเอียดการแก้ไข" />
                                <CardContent>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} lg={5}>
                                            <Typography variant="subtitle2" gutterBottom>เลือกประเภทการแก้ไข</Typography>
                                            <Paper variant='outlined' sx={{ p: 2, maxHeight: 400, overflowY: 'auto' }}>
                                                <FormGroup>
                                                    {allCorrectionTypes.map(type => (
                                                        <FormControlLabel key={type.CorrectionTypeID} control={<Checkbox value={type.CorrectionTypeID} checked={selectedTypeIds.includes(type.CorrectionTypeID)} onChange={handleTypeChange} />} label={type.CorrectionTypeName} />
                                                    ))}
                                                </FormGroup>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={12} lg={7}>
                                            <Typography variant="subtitle2" gutterBottom>กรอกรายละเอียด</Typography>
                                            <Box sx={{ minHeight: 350 }}>
                                                {selectedTypeIds.length > 0 ? (
                                                    <Box>
                                                        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                                            {selectedTypeIds.map((typeId) => {
                                                                const type = allCorrectionTypes.find(t => t.CorrectionTypeID === typeId);
                                                                return <Tab label={type?.CorrectionTypeName || '...'} key={typeId} />;
                                                            })}
                                                        </Tabs>
                                                        <Box sx={{ p: 2 }}>
                                                            {selectedTypeIds.map((typeId, index) => {
                                                                const typeConfig = allCorrectionTypes.find(t => t.CorrectionTypeID === typeId);
                                                                const fields = typeConfig ? JSON.parse(typeConfig.FieldsConfig || '[]') : [];
                                                                return (
                                                                    <TabPanel key={typeId} value={activeTab} index={index}>
                                                                        {fields.length > 0 ? (
                                                                            <Stack spacing={2}>
                                                                                {fields.map((field, fIndex) => (
                                                                                    <TextField 
                                                                                        key={fIndex} 
                                                                                        label={field.label} 
                                                                                        required={field.required} 
                                                                                        fullWidth 
                                                                                        size="small" 
                                                                                        variant="outlined"
                                                                                        value={dynamicFieldValues[typeId]?.[`val${fIndex + 1}`] || ''}
                                                                                        onChange={(e) => handleDynamicFieldChange(typeId, fIndex, e.target.value)}
                                                                                        multiline={field.type === 'textarea'} 
                                                                                        minRows={field.type === 'textarea' ? 3 : 1}
                                                                                        maxRows={field.type === 'textarea' ? 10 : 1}
                                                                                    />
                                                                                ))}
                                                                            </Stack>
                                                                        ) : <Typography color="text.secondary">ไม่มีรายละเอียดที่ต้องกรอก</Typography>}
                                                                    </TabPanel>
                                                                );
                                                            })}
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '350px', border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}>
                                                        <Typography color="text.secondary">เลือกประเภทเพื่อกรอกรายละเอียด</Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            <AttachmentsManager
                                existingFiles={[...existingAttachments, ...newFiles]}
                                onFilesChange={handleFilesChange}
                            />

                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Stack spacing={3}>
                            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardHeader avatar={<Avatar sx={{ bgcolor: 'primary.light' }}><InfoIcon /></Avatar>} title="ข้อมูลคำร้อง" />
                                <CardContent>
                                    <Stack spacing={1.5}>
                                        <TextField label="หมวดหมู่" value={formData.CategoryName || ''} fullWidth InputProps={{ readOnly: true }} variant="outlined" size="small" />
                                        <TextField label="ผู้ขอ" value={formData.RequesterFullName || ''} fullWidth InputProps={{ readOnly: true }} variant="outlined" size="small" />
                                        <Chip label={`สถานะ: ${formData.StatusName}`} color={formData.StatusCode === 'REVISION_REQUIRED' ? 'error' : 'warning'} />
                                    </Stack>
                                </CardContent>
                            </Card>
                            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardHeader avatar={<Avatar sx={{ bgcolor: 'primary.light' }}><PlaylistAddCheckIcon /></Avatar>} title="เส้นทางการอนุมัติ" />
                                <CardContent>
                                    <WorkflowPreview categoryId={formData.CategoryID} correctionTypeIds={selectedTypeIds} />
                                </CardContent>
                            </Card>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
};

export default RequestEditPage;