// frontend/src/pages/admin/WorkflowConfigPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, Button, CircularProgress, Alert,
    FormControl, InputLabel, Select, MenuItem, Stack, IconButton,
    Tooltip, Divider, Grid, Avatar, List,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete, Chip
} from '@mui/material';
import adminService from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import api from '../../services/api';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Icons
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BugReportIcon from '@mui/icons-material/BugReport';

const STATUS_IDS = { INITIAL: 1, REVISION: 4, COMPLETED: 5 };
const ACTION_IDS = { APPROVE: 1, REJECT: 2, IT_PROCESS: 3, CONFIRM_COMPLETE: 4 };

const SortableStepItem = ({ id, step, index, masterData, onStepChange, onRemoveStep }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    
    const selectedUserObjects = masterData.users.filter(user => (step.assignedUsers || []).includes(user.UserID));

    const menuProps = {
        PaperProps: {
            style: {
                minWidth: 250,
            },
        },
    };

    return (
        <Paper ref={setNodeRef} style={style} variant="outlined" sx={{ p: 2, mb: 2, touchAction: 'none' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
                <Tooltip title="ลากเพื่อจัดลำดับ">
                    <IconButton {...attributes} {...listeners} sx={{ cursor: 'grab' }}>
                        <DragIndicatorIcon />
                    </IconButton>
                </Tooltip>
                
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>{index + 1}</Avatar>

                <Stack flexGrow={1} spacing={2}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>Role หลัก</InputLabel>
                                <Select 
                                    value={step.RequiredRoleID} 
                                    label="Role หลัก" 
                                    onChange={(e) => onStepChange(index, 'RequiredRoleID', e.target.value)}
                                    MenuProps={menuProps}
                                >
                                    {masterData.roles.map(r => <MenuItem key={r.RoleID} value={r.RoleID}>{r.Description} ({r.RoleName})</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>Action ที่ทำ</InputLabel>
                                <Select 
                                    value={step.ActionID} 
                                    label="Action ที่ทำ" 
                                    onChange={(e) => onStepChange(index, 'ActionID', e.target.value)}
                                    MenuProps={menuProps}
                                >
                                    {masterData.actions.map(a => <MenuItem key={a.ActionID} value={a.ActionID}>{a.DisplayName}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>ถ้าสำเร็จ ไปที่สถานะ</InputLabel>
                                <Select 
                                    value={step.NextStatusID} 
                                    label="ถ้าสำเร็จ ไปที่สถานะ" 
                                    onChange={(e) => onStepChange(index, 'NextStatusID', e.target.value)}
                                    MenuProps={menuProps}
                                >
                                    {masterData.statuses.map(s => <MenuItem key={s.StatusID} value={s.StatusID}>{s.StatusName}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                        <Divider sx={{ flexGrow: 1 }} />
                        <Typography variant="caption">ตั้งค่าเพิ่มเติม (ถ้ามี)</Typography>
                        <Divider sx={{ flexGrow: 1 }} />
                    </Stack>

                    <Autocomplete
                        multiple
                        size="small"
                        options={masterData.users}
                        getOptionLabel={(option) => `${option.FullName} (${option.Username})`}
                        value={selectedUserObjects}
                        onChange={(event, newValue) => {
                            const userIds = newValue.map(user => user.UserID);
                            onStepChange(index, 'assignedUsers', userIds);
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="outlined"
                                label="เจาะจงผู้อนุมัติ (จะถูกใช้แทน Role หลัก)"
                                placeholder="ค้นหาชื่อ..."
                            />
                        )}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => {
                                const { key, ...tagProps } = getTagProps({ index });
                                return <Chip key={key} variant="outlined" label={option.FullName} size="small" {...tagProps} />;
                            })
                        }
                    />
                </Stack>

                <IconButton size="small" color="error" onClick={() => onRemoveStep(index)} sx={{ alignSelf: 'center', ml: 1 }}>
                    <DeleteIcon />
                </IconButton>
            </Stack>
        </Paper>
    );
};

const WorkflowConfigPage = () => {
    const [masterData, setMasterData] = useState({ categories: [], users: [], statuses: [], roles: [], actions: [] });
    const [selection, setSelection] = useState({ categoryId: '', correctionTypeId: '' });
    const [filteredCorrectionTypes, setFilteredCorrectionTypes] = useState([]);
    const [approvalSteps, setApprovalSteps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const notification = useNotification();
    const [openCopyDialog, setOpenCopyDialog] = useState(false);
    const [copySelection, setCopySelection] = useState({ sourceCategoryId: '', sourceCorrectionTypeId: '', targetCategoryId: '', targetCorrectionTypeId: '' });
    const [debugData, setDebugData] = useState(null);

    const [sourceCorrectionTypes, setSourceCorrectionTypes] = useState([]);
    const [targetCorrectionTypes, setTargetCorrectionTypes] = useState([]);

    const loadMasterData = useCallback(() => {
        setLoading(true);
        Promise.all([
            adminService.getCategories(),
            adminService.getUsers({ limit: 1000 }),
            adminService.getStatuses(),
            adminService.getRoles(),
            adminService.getActions()
        ]).then(([catRes, userRes, statusRes, roleRes, actionRes]) => {
            setMasterData({
                categories: catRes.data,
                users: userRes.data.users,
                statuses: statusRes.data,
                roles: roleRes.data,
                actions: actionRes.data
            });
            const generalType = { CorrectionTypeID: '', CorrectionTypeName: 'ทั่วไป (ไม่ระบุประเภท)' };
            setFilteredCorrectionTypes([generalType]);
            setSourceCorrectionTypes([generalType]);
            setTargetCorrectionTypes([generalType]);
        }).catch(() => { notification.showNotification('ไม่สามารถโหลดข้อมูลหลักได้', 'error'); }).finally(() => { setLoading(false); });
    }, [notification]);

    useEffect(() => { loadMasterData(); }, [loadMasterData]);

    useEffect(() => {
        const generalType = { CorrectionTypeID: '', CorrectionTypeName: 'ทั่วไป (ไม่ระบุประเภท)' };
        if (selection.categoryId) {
            setLoading(true);
            api.get(`/master/correction-types?categoryId=${selection.categoryId}`)
                .then(res => {
                    setFilteredCorrectionTypes([generalType, ...res.data]);
                })
                .catch(() => setFilteredCorrectionTypes([generalType]))
                .finally(() => setLoading(false));
        } else {
            setFilteredCorrectionTypes([generalType]);
        }
    }, [selection.categoryId]);

    const handleFetchWorkflow = useCallback(() => {
        if (!selection.categoryId) {
            setApprovalSteps([]);
            return;
        }
        setLoading(true);
        Promise.all([
            adminService.getWorkflow(selection.categoryId, selection.correctionTypeId || null),
            adminService.getSpecialApproverMappings({categoryId: selection.categoryId, correctionTypeId: selection.correctionTypeId || null})
        ]).then(([workflowRes, specialMapRes]) => {
                const mainTransitions = workflowRes.data.filter(t => t.ActionID !== ACTION_IDS.REJECT);
                
                const groupedSteps = mainTransitions.reduce((acc, tran) => {
                    if (!acc[tran.StepSequence]) {
                        acc[tran.StepSequence] = {
                            id: `step-${tran.StepSequence}-${Date.now()}`,
                            StepSequence: tran.StepSequence,
                            CurrentStatusID: tran.CurrentStatusID,
                            NextStatusID: tran.NextStatusID,
                            transitions: []
                        };
                    }
                    acc[tran.StepSequence].transitions.push(tran);
                    return acc;
                }, {});
                
                const steps = Object.values(groupedSteps).map(group => {
                    const firstTransition = group.transitions[0];
                    const assignedUsers = specialMapRes.data
                        .filter(m => m.StepSequence === firstTransition.StepSequence)
                        .map(m => m.UserID);
                    
                    return {
                        id: group.id,
                        StepSequence: firstTransition.StepSequence,
                        CurrentStatusID: firstTransition.CurrentStatusID,
                        RequiredRoleID: firstTransition.RequiredRoleID, 
                        ActionID: firstTransition.ActionID, 
                        NextStatusID: firstTransition.NextStatusID,
                        FilterByDepartment: firstTransition.FilterByDepartment,
                        assignedUsers: assignedUsers,
                    }
                });
                
                setApprovalSteps(steps);
            })
            .catch(() => { 
                notification.showNotification('ไม่สามารถดึงข้อมูล Workflow ได้', 'error'); 
                setApprovalSteps([]); 
            })
            .finally(() => { 
                setLoading(false); 
            });
    }, [selection, notification]);
    
    useEffect(() => { handleFetchWorkflow(); }, [handleFetchWorkflow]);
    
    useEffect(() => {
        const generalType = { CorrectionTypeID: '', CorrectionTypeName: 'ทั่วไป (ไม่ระบุประเภท)' };
        if (copySelection.sourceCategoryId) {
            api.get(`/master/correction-types?categoryId=${copySelection.sourceCategoryId}`)
                .then(res => {
                    setSourceCorrectionTypes([generalType, ...res.data]);
                })
                .catch(() => setSourceCorrectionTypes([generalType]));
        } else {
            setSourceCorrectionTypes([generalType]);
        }
        setCopySelection(prev => ({ ...prev, sourceCorrectionTypeId: '' }));
    }, [copySelection.sourceCategoryId]);

    useEffect(() => {
        const generalType = { CorrectionTypeID: '', CorrectionTypeName: 'ทั่วไป (ไม่ระบุประเภท)' };
        if (copySelection.targetCategoryId) {
            api.get(`/master/correction-types?categoryId=${copySelection.targetCategoryId}`)
                .then(res => {
                    setTargetCorrectionTypes([generalType, ...res.data]);
                })
                .catch(() => setTargetCorrectionTypes([generalType]));
        } else {
            setTargetCorrectionTypes([generalType]);
        }
        setCopySelection(prev => ({ ...prev, targetCorrectionTypeId: '' }));
    }, [copySelection.targetCategoryId]);


    const handleStepChange = (index, field, value) => { const newSteps = [...approvalSteps]; newSteps[index][field] = value; setApprovalSteps(newSteps); };
    
    const handleAddStep = () => {
        setApprovalSteps([...approvalSteps, { 
            id: `new-step-${Date.now()}`, 
            RequiredRoleID: '', 
            ActionID: '',
            NextStatusID: '', 
            FilterByDepartment: false,
            assignedUsers: []
        }]); 
    };
    
    const handleRemoveStep = (index) => { setApprovalSteps(approvalSteps.filter((_, i) => i !== index)); };

    const handleDeleteWorkflow = async () => {
        if (!selection.categoryId) return;
        if (!window.confirm(`คุณต้องการลบ Workflow ของ '${masterData.categories.find(c => c.CategoryID === selection.categoryId)?.CategoryName}' ใช่หรือไม่?`)) return;

        try {
            await adminService.deleteWorkflow({
                categoryId: selection.categoryId,
                correctionTypeId: selection.correctionTypeId || null
            });
            notification.showNotification('ลบ Workflow สำเร็จ!', 'success');
            handleFetchWorkflow();
        } catch (err) {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
        }
    };
    
    const generateTransitions = () => {
        const generatedTransitions = [];
        let currentStatusForStep = STATUS_IDS.INITIAL;

        approvalSteps.forEach((step, index) => {
            if (step.RequiredRoleID && step.ActionID && step.NextStatusID) {
                generatedTransitions.push({
                    CurrentStatusID: currentStatusForStep,
                    ActionID: step.ActionID,
                    RequiredRoleID: step.RequiredRoleID,
                    NextStatusID: step.NextStatusID,
                    FilterByDepartment: step.FilterByDepartment,
                    StepSequence: index
                });
                generatedTransitions.push({
                    CurrentStatusID: currentStatusForStep,
                    ActionID: ACTION_IDS.REJECT,
                    RequiredRoleID: step.RequiredRoleID,
                    NextStatusID: STATUS_IDS.REVISION,
                    FilterByDepartment: step.FilterByDepartment,
                    StepSequence: index
                });
            }
            
            currentStatusForStep = step.NextStatusID;
        });
        return generatedTransitions;
    };

    const handleDebug = () => {
        const data = generateTransitions();
        setDebugData(JSON.stringify(data, null, 2));
    };

    const handleSaveWorkflow = () => {
        const isIncomplete = approvalSteps.some(step => !step.RequiredRoleID || !step.NextStatusID || !step.ActionID);
        if (isIncomplete) {
            notification.showNotification('กรุณากรอกข้อมูลให้ครบทุกขั้นตอน (Role, Action, Next Status)', 'warning');
            return;
        }

        if (approvalSteps.length > 0 && approvalSteps[approvalSteps.length - 1].NextStatusID !== STATUS_IDS.COMPLETED) {
            const finalStatus = masterData.statuses.find(s => s.StatusID === STATUS_IDS.COMPLETED);
            notification.showNotification(`ขั้นตอนสุดท้ายต้องไปที่สถานะ "${finalStatus?.StatusName || 'Completed'}" เสมอ`, 'warning');
            return;
        }
        
        setIsSaving(true);
        const transitions = generateTransitions();
        const workflowData = { categoryId: selection.categoryId, correctionTypeId: selection.correctionTypeId || null, transitions };
        
        const specialMappings = approvalSteps.map((step, index) => ({
            step: index,
            userIds: step.assignedUsers || []
        })).filter(m => m.userIds.length > 0);

        const mappingsData = {
            categoryId: selection.categoryId,
            correctionTypeId: selection.correctionTypeId || null,
            mappings: specialMappings
        };

        Promise.all([
            adminService.updateWorkflow(workflowData),
            adminService.updateSpecialApproverMappings(mappingsData)
        ]).then(() => {
            notification.showNotification('บันทึก Workflow สำเร็จ!', 'success');
            handleFetchWorkflow();
        }).catch(err => {
            notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        }).finally(() => {
            setIsSaving(false);
        });
    };

    const sensors = useSensors(useSensor(PointerSensor));
    const handleDragEnd = (event) => { const { active, over } = event; if (active.id !== over.id) { setApprovalSteps((items) => { const oldIndex = items.findIndex(item => item.id === active.id); const newIndex = items.findIndex(item => item.id === over.id); return arrayMove(items, oldIndex, newIndex); }); } };
    
    const handleOpenCopyDialog = () => { setCopySelection({ sourceCategoryId: selection.categoryId || '', sourceCorrectionTypeId: selection.correctionTypeId || '', targetCategoryId: '', targetCorrectionTypeId: '' }); setOpenCopyDialog(true); };
    const handleCopySelectionChange = (e) => { setCopySelection(prev => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleCopyWorkflow = async () => {
        const { sourceCategoryId, targetCategoryId } = copySelection;
        if (!sourceCategoryId || !targetCategoryId) { notification.showNotification('กรุณาเลือกหมวดหมู่ต้นทางและปลายทาง', 'warning'); return; }
        try {
            await adminService.copyWorkflow({ ...copySelection, sourceCorrectionTypeId: copySelection.sourceCorrectionTypeId || null, targetCorrectionTypeId: copySelection.targetCorrectionTypeId || null });
            notification.showNotification('คัดลอก Workflow สำเร็จ!', 'success'); setOpenCopyDialog(false);
            if (targetCategoryId === selection.categoryId) { handleFetchWorkflow(); }
        } catch (err) { notification.showNotification(err.response?.data?.message || 'เกิดข้อผิดพลาดในการคัดลอก', 'error'); }
    };

    const getRoleName = (roleId) => masterData.roles.find(r => r.RoleID === roleId)?.Description || 'N/A';
    const getStatusName = (statusId) => masterData.statuses.find(s => s.StatusID === statusId)?.StatusName || 'N/A';
    const getActionName = (actionId) => masterData.actions.find(a => a.ActionID === actionId)?.DisplayName || 'N/A';

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>ตั้งค่า Workflow</Typography>
                <Button variant="outlined" startIcon={<FileCopyIcon />} onClick={handleOpenCopyDialog}>
                    คัดลอก Workflow
                </Button>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
                <FormControl fullWidth>
                    <InputLabel>หมวดหมู่</InputLabel>
                    <Select value={selection.categoryId} label="หมวดหมู่" onChange={(e) => setSelection({ ...selection, categoryId: e.target.value, correctionTypeId: '' })}>
                        {masterData.categories.map(cat => <MenuItem key={cat.CategoryID} value={cat.CategoryID}>{cat.CategoryName}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl fullWidth>
                    <InputLabel>ประเภทการแก้ไข (ถ้ามี)</InputLabel>
                    <Select value={selection.correctionTypeId} label="ประเภทการแก้ไข (ถ้ามี)" onChange={(e) => setSelection({ ...selection, correctionTypeId: e.target.value })}>
                        {filteredCorrectionTypes.map(type => <MenuItem key={type.CorrectionTypeID} value={type.CorrectionTypeID}>{type.CorrectionTypeName}</MenuItem>)}
                    </Select>
                </FormControl>
            </Stack>

            <Divider sx={{ my: 3 }} />
            
            <Grid container spacing={4}>
                <Grid item lg={8} xs={12}>
                    <Typography variant="h6" sx={{ mb: 2 }}>เส้นทางการอนุมัติ (ลากเพื่อจัดลำดับ)</Typography>
                    {!selection.categoryId ? (<Alert severity="info">กรุณาเลือกหมวดหมู่และประเภทการแก้ไข เพื่อเริ่มตั้งค่า Workflow</Alert>)
                    : loading ? (<CircularProgress />)
                    : (<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={approvalSteps} strategy={verticalListSortingStrategy}>
                            <Box>
                                {approvalSteps.map((step, index) => (
                                    <SortableStepItem key={step.id} id={step.id} step={step} index={index} masterData={masterData} onStepChange={handleStepChange} onRemoveStep={handleRemoveStep} />
                                ))}
                            </Box>
                        </SortableContext>
                       </DndContext>
                    )}
                    <Button
                        startIcon={<AddIcon />}
                        onClick={handleAddStep}
                        variant="outlined"
                        sx={{ mt: 2 }}
                        disabled={!selection.categoryId || loading}
                    >
                        เพิ่มขั้นตอนอนุมัติ
                    </Button>
                </Grid>
                <Grid item lg={4} xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, position: 'sticky', top: '88px' }}>
                         <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}><VisibilityIcon sx={{ mr: 1, color: 'text.secondary' }} /> ตัวอย่าง Flow</Typography>
                        {approvalSteps.length > 0 ? (
                            <Stack spacing={1} divider={<Divider>↓</Divider>}>
                                <Typography align="center" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>เริ่มต้น</Typography>
                                {approvalSteps.map((step, index) => (
                                    <Box key={index} sx={{textAlign: 'center'}}>
                                        <Typography>
                                            {`รอ ${getActionName(step.ActionID)} โดย ${getRoleName(step.RequiredRoleID)}`}
                                        </Typography>
                                        <Typography variant="caption" color="primary.main">
                                            {`(ถ้าสำเร็จ จะไปสถานะ: ${getStatusName(step.NextStatusID)})`}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        ) : (<Alert severity="info" sx={{mt: 1}}>ยังไม่มีขั้นตอนใน Workflow</Alert>)}
                    </Paper>
                </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={1}>
                     <Button variant="outlined" color="error" onClick={handleDeleteWorkflow} disabled={!selection.categoryId}>
                        ลบ Workflow นี้
                    </Button>
                     <Button variant="outlined" color="secondary" startIcon={<BugReportIcon />} onClick={handleDebug} disabled={!selection.categoryId}>
                        ตรวจสอบข้อมูล (Debug)
                    </Button>
                </Stack>
                <Button variant="contained" color="primary" onClick={handleSaveWorkflow} disabled={isSaving || !selection.categoryId} startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}>บันทึก Workflow</Button>
            </Box>

            <Dialog open={!!debugData} onClose={() => setDebugData(null)} fullWidth maxWidth="md">
                <DialogTitle>ข้อมูลดิบ (JSON) ที่จะถูกส่งไปบันทึก</DialogTitle>
                <DialogContent>
                    <Paper component="pre" sx={{ p: 2, backgroundColor: '#f5f5f5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '60vh', overflow: 'auto' }}>
                        <code>{debugData}</code>
                    </Paper>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDebugData(null)}>ปิด</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openCopyDialog} onClose={() => setOpenCopyDialog(false)} fullWidth maxWidth="sm">
                <DialogTitle>คัดลอก Workflow</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ pt: 1 }}>
                        <Typography variant="subtitle1">ต้นทาง</Typography>
                        <FormControl fullWidth><InputLabel>จากหมวดหมู่</InputLabel><Select name="sourceCategoryId" value={copySelection.sourceCategoryId} label="จากหมวดหมู่" onChange={handleCopySelectionChange}>{masterData.categories.map(c => <MenuItem key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</MenuItem>)}</Select></FormControl>
                        <FormControl fullWidth>
                            <InputLabel>จากประเภทการแก้ไข (ถ้ามี)</InputLabel>
                            <Select name="sourceCorrectionTypeId" value={copySelection.sourceCorrectionTypeId} label="จากประเภทการแก้ไข (ถ้ามี)" onChange={handleCopySelectionChange}>
                                {sourceCorrectionTypes.map(t => <MenuItem key={t.CorrectionTypeID} value={t.CorrectionTypeID}>{t.CorrectionTypeName}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Divider />
                        <Typography variant="subtitle1">ปลายทาง</Typography>
                        <FormControl fullWidth><InputLabel>ไปยังหมวดหมู่</InputLabel><Select name="targetCategoryId" value={copySelection.targetCategoryId} label="ไปยังหมวดหมู่" onChange={handleCopySelectionChange}>{masterData.categories.map(c => <MenuItem key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</MenuItem>)}</Select></FormControl>
                        <FormControl fullWidth>
                            <InputLabel>ไปยังประเภทการแก้ไข (ถ้ามี)</InputLabel>
                            <Select name="targetCorrectionTypeId" value={copySelection.targetCorrectionTypeId} label="ไปยังประเภทการแก้ไข (ถ้ามี)" onChange={handleCopySelectionChange}>
                                {targetCorrectionTypes.map(t => <MenuItem key={t.CorrectionTypeID} value={t.CorrectionTypeID}>{t.CorrectionTypeName}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCopyDialog(false)}>ยกเลิก</Button>
                    <Button onClick={handleCopyWorkflow} variant="contained">คัดลอก</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default WorkflowConfigPage;