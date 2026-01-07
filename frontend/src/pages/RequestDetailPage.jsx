// frontend/src/pages/RequestDetailPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import requestService from "../services/requestService";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import TsmLogo from "../assets/images/tsmlogo.png";
import { notoSansThaiThinBase64 } from "../helpers/NotoSansThai-Thin-normal.js";
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

import emailService from "../services/emailService";
import { getApprovalEmail, getRevisionEmail, getCompletionEmail } from "../helpers/emailTemplateHelper";

import {
  Box, Paper, Typography, CircularProgress, Grid, Divider, Button, TextField,
  Alert, Link, Stack, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Chip,
  FormControlLabel, Checkbox, Tooltip, Avatar, List, ListItem, ListItemAvatar, ListItemText, useTheme // 💡 เพิ่ม useTheme
} from "@mui/material";
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot, timelineItemClasses } from "@mui/lab";
import { motion } from "framer-motion";

// --- Icons ---
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import HistoryIcon from "@mui/icons-material/History";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ArchiveIcon from '@mui/icons-material/Archive';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// --- Helper Components (เหมือนเดิม) ---
const InfoField = ({ label, value }) => ( <Box sx={{ display: "flex", alignItems: "flex-end", mb: 1, width: "100%" }}> <Typography variant="body2" sx={{ fontWeight: "bold", mr: 1, whiteSpace: "nowrap" }}> {label}: </Typography> <Typography variant="body2" sx={{ borderBottom: "1px dotted #000", flexGrow: 1, minHeight: "20px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", }} > {value || ""} </Typography> </Box> );
const CheckboxDisplay = ({ label, checked }) => ( <Box sx={{ display: 'flex', alignItems: 'center' }}> {checked ? <CheckBoxIcon sx={{ fontSize: 20, mr: 1 }} /> : <CheckBoxOutlineBlankIcon sx={{ fontSize: 20, mr: 1 }} />} <Typography variant="body2">{label}</Typography> </Box> );

const FileAttachment = ({ path, baseUrl }) => {
    const fileUrl = `${baseUrl}${path}`;
    const fileName = path.split('/').pop();
    const fileExtension = path.split('.').pop().toLowerCase();

    const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension);

    const getFileIcon = () => {
        if (fileExtension === 'pdf') return <PictureAsPdfIcon sx={{ fontSize: 40, color: '#D32F2F' }} />;
        if (['doc', 'docx'].includes(fileExtension)) return <DescriptionIcon sx={{ fontSize: 40, color: '#2B579A' }} />;
        if (['xls', 'xlsx'].includes(fileExtension)) return <AssessmentIcon sx={{ fontSize: 40, color: '#1D6F42' }} />;
        if (['zip', 'rar'].includes(fileExtension)) return <ArchiveIcon sx={{ fontSize: 40, color: '#FFCA28' }} />;
        return <InsertDriveFileIcon sx={{ fontSize: 40 }} />;
    };

    return (
        <Tooltip title={fileName}>
            <Link href={fileUrl} target="_blank" rel="noopener noreferrer" sx={{ textDecoration: 'none' }}>
                <Paper
                    variant="outlined"
                    sx={{
                        width: 120, height: 120, display: 'flex', flexDirection: 'column',
                        justifyContent: 'center', alignItems: 'center', p: 1,
                        '&:hover': { borderColor: 'primary.main', boxShadow: 1 }
                    }}
                >
                    {isImage ? (
                        <img src={fileUrl} alt={fileName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                        <>
                            {getFileIcon()}
                            <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                {fileName}
                            </Typography>
                        </>
                    )}
                </Paper>
            </Link>
        </Tooltip>
    );
};


const RequestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const notification = useNotification();
    const { user: currentUser } = useAuth();
    const formRef = useRef();
    const theme = useTheme(); // 💡 เพิ่ม useTheme เพื่อเข้าถึง palette.grey

    const [request, setRequest] = useState(null);
    const [history, setHistory] = useState([]);
    const [possibleActions, setPossibleActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [dialog, setDialog] = useState({ open: false, action: null });
    const [comment, setComment] = useState("");
    const [itData, setItData] = useState({ operatorName: "", completedAt: new Date(), obstacles: "" });
    const [requiresCCS, setRequiresCCS] = useState(false);
    const [exporting, setExporting] = useState(false);
    const IMAGE_URL = import.meta.env.VITE_API_IMAGE_URL;

    const fetchData = () => {
        setLoading(true);
        requestService.getRequestById(id)
            .then((res) => {
                const { request: reqData, history: histData, possibleActions: actionsData } = res.data;
                if (reqData) {
                    reqData.ProblemSystem = Array.isArray(reqData.ProblemSystem) ? reqData.ProblemSystem : (reqData.ProblemSystem ? reqData.ProblemSystem.split(", ") : []);
                    reqData.AttachmentPath = reqData.AttachmentPath || [];
                    setRequest(reqData);
                    setHistory(histData || []); 
                    setPossibleActions(actionsData || []);
                    
                    setItData({
                        operatorName: reqData.IT_OperatorName || currentUser.fullName,
                        completedAt: reqData.IT_CompletedAt ? new Date(reqData.IT_CompletedAt) : new Date(),
                        obstacles: reqData.IT_Obstacles || ""
                    });

                    const requestDate = new Date(reqData.RequestDate);
                    const now = new Date();
                    const cutoffTime = new Date(requestDate.getTime());
                    cutoffTime.setHours(15, 0, 0, 0);

                    const isSameDay = requestDate.toDateString() === now.toDateString();
                    const defaultRequiresCCS = reqData.RequiresCCSClosing && (!isSameDay || (isSameDay && now > cutoffTime));
                    setRequiresCCS(defaultRequiresCCS);

                } else { setError("ไม่พบข้อมูลคำร้อง"); }
            })
            .catch(() => { setError("ไม่สามารถโหลดข้อมูลคำร้องได้") })
            .finally(() => { setLoading(false) });
    };

    useEffect(() => {
        fetchData();
    }, [id, currentUser.fullName]);

    const handleEmailNotification = (apiResponse) => {
        const { nextApprovers, requesterInfo, emailTemplate, requestData } = apiResponse;

        if (nextApprovers && nextApprovers.length > 0) {
            const emails = nextApprovers.map(a => a.email).filter(Boolean);
            if (emails.length > 0) {
                const { subject, body } = getApprovalEmail(requestData);
                emailService.sendEmail({ to: emails, subject, body })
                    .catch(err => notification.showNotification('ไม่สามารถส่งอีเมลแจ้งเตือนผู้อนุมัติได้', 'error'));
            }
        }
        
        if (requesterInfo && emailTemplate) {
            let emailContent;
            if (emailTemplate === 'RevisionRequired') {
                emailContent = getRevisionEmail(requestData, requesterInfo);
            } else if (emailTemplate === 'RequestCompleted') {
                emailContent = getCompletionEmail(requestData, requesterInfo);
            }
            
            if (emailContent) {
                emailService.sendEmail({ to: [requesterInfo.email], subject: emailContent.subject, body: emailContent.body })
                    .catch(err => notification.showNotification('ไม่สามารถส่งอีเมลแจ้งผู้ขอได้', 'error'));
            }
        }
    };


    const handlePerformAction = async () => {
        if (!dialog.action) return;

        setIsSubmitting(true);
        const { ActionName } = dialog.action;
        let payload = { actionName: ActionName };

        if (ActionName === 'REJECT' && !comment.trim()) {
            notification.showNotification("กรุณาระบุเหตุผลในการปฏิเสธ", "warning");
            setIsSubmitting(false);
            return;
        }

        if (['APPROVE', 'REJECT', 'CONFIRM_COMPLETE', 'CCS_CLOSE'].includes(ActionName)) {
            payload.comment = comment;
        }

        if (ActionName === 'IT_PROCESS') {
            if (!itData.operatorName || !itData.completedAt) {
                notification.showNotification("กรุณาระบุชื่อผู้ปฏิบัติงานและวันที่เสร็จสิ้น", "warning");
                setIsSubmitting(false);
                return;
            }
            payload.itData = {
                ...itData,
                completedAt: new Date(itData.completedAt).toISOString(),
                requiresCCS: requiresCCS
            };
        }

        try {
            const res = await requestService.performAction(id, payload);
            notification.showNotification(`ดำเนินการ '${dialog.action.ActionDisplayName}' สำเร็จ`, "success");
            
            handleEmailNotification(res.data);
            
            setDialog({ open: false, action: null });
            setComment("");
            fetchData(); 

        } catch (err) {
            notification.showNotification(err.response?.data?.message || `เกิดข้อผิดพลาดในการดำเนินการ`, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getSignatureByRole = (targetRoleName) => {
        const targetRoles = Array.isArray(targetRoleName) ? targetRoleName : [targetRoleName];
        
        const approval = [...history].reverse().find(h => 
            targetRoles.includes(h.RoleName) && h.ActionType.includes('อนุมัติ')
        );

        if (approval) {
            return approval.FullName;
        }
        return "";
    };

    const requesterSignature = request?.RequesterFullName || '';
    const reviewerSignature = getSignatureByRole("Head of Department");
    const accountantSignature = getSignatureByRole(["Accountant", "Special User"]);
    const finalApproverSignature = getSignatureByRole("Final Approver");
    
    const itReviewerApproval = [...history].reverse().find(h => h.RoleName === 'IT Reviewer');
    const itApproverSignature = itReviewerApproval ? itReviewerApproval.FullName : '';
    const itOperatorSignature = request?.IT_OperatorName || '';

    const openActionDialog = (action) => {
        setComment(action.ActionDisplayName);
        setDialog({ open: true, action });
    };
    
    const handleExportPdf = async () => {
        const formElement = formRef.current;
        if (!formElement || !request) return;
    
        setExporting(true);
    
        try {
            const formCanvas = await html2canvas(formElement, { scale: 2, useCORS: true, logging: false, onclone: (document) => { const exportButton = document.getElementById("export-pdf-button"); const attachmentSection = document.getElementById("attachment-section-web"); if (exportButton) exportButton.style.display = 'none'; if (attachmentSection) attachmentSection.style.display = 'none'; const clonedForm = document.getElementById("export-form-paper"); if (clonedForm) clonedForm.style.width = '1100px'; } });
            const formImgData = formCanvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
    
            pdf.addFileToVFS("NotoSansThai-Thin.ttf", notoSansThaiThinBase64);
            pdf.addFont("NotoSansThai-Thin.ttf", "NotoSansThai", "normal");
            pdf.setFont("NotoSansThai");
    
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const contentW = pageW - margin * 2;
            const formAspectRatio = formCanvas.height / formCanvas.width;
            const contentH = contentW * formAspectRatio;
            pdf.addImage(formImgData, 'PNG', margin, margin, contentW, contentH);
    
            const attachments = request.AttachmentPath || [];
            if (attachments.length > 0) {
                for (const path of attachments) {
                    // ✅ ตรวจสอบ file extension ก่อนโหลด
                    const fileName = path.split('/').pop();
                    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                    const isImageFile = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension);
                    
                    // ✅ เฉพาะไฟล์รูปภาพเท่านั้นที่จะถูกเพิ่มใน PDF
                    if (isImageFile) {
                        try {
                            const imageUrl = IMAGE_URL + path;
                            const img = new Image();
                            img.crossOrigin = 'Anonymous';
                            img.src = imageUrl;
        
                            await new Promise((resolve, reject) => { 
                                img.onload = resolve; 
                                img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`)); 
                            });
                            
                            pdf.addPage();
        
                            const imgAspectRatio = img.height / img.width;
                            let imgW = contentW;
                            let imgH = imgW * imgAspectRatio;
        
                            if (imgH > pageH - (margin * 2)) { 
                                imgH = pageH - (margin * 2); 
                                imgW = imgH / imgAspectRatio; 
                            }
        
                            const x = (pageW - imgW) / 2;
                            const y = (pageH - imgH) / 2;
        
                            pdf.addImage(img, 'JPEG', x, y, imgW, imgH);
                        } catch (imgError) {
                            console.error(`Failed to load image attachment: ${fileName}`, imgError);
                            // ⚠️ ไม่สร้างหน้า PDF เพิ่มเมื่อโหลดรูปภาพไม่สำเร็จ (ข้ามไฟล์นั้น)
                        }
                    } else {
                        // ℹ️ ไฟล์ที่ไม่ใช่รูปภาพ (PDF, DOC, XLS, ZIP, etc.) จะไม่ถูกเพิ่มใน PDF
                        // ผู้ใช้สามารถเปิดไฟล์เหล่านี้ได้จากลิงก์ในเว็บแทน
                        console.log(`Skipping non-image file in PDF export: ${fileName} (${fileExtension})`);
                    }
                    
                    // ===== START: โค้ดเก่า (คอมเมนต์ไว้) =====
                    /*
                    // ❌ โค้ดเก่า: พยายามโหลดทุกไฟล์เป็น image และสร้างหน้า error เมื่อโหลดไม่ได้
                    try {
                        const imageUrl = IMAGE_URL + path;
                        const img = new Image();
                        img.crossOrigin = 'Anonymous';
                        img.src = imageUrl;
    
                        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`)); });
                        pdf.addPage();
    
                        const imgAspectRatio = img.height / img.width;
                        let imgW = contentW;
                        let imgH = imgW * imgAspectRatio;
    
                        if (imgH > pageH - (margin * 2)) { imgH = pageH - (margin * 2); imgW = imgH / imgAspectRatio; }
    
                        const x = (pageW - imgW) / 2;
                        const y = (pageH - imgH) / 2;
    
                        pdf.addImage(img, 'JPEG', x, y, imgW, imgH);
                    } catch (imgError) {
                        console.error(imgError);
                        pdf.addPage();  // ❌ ปัญหา: สร้างหน้า PDF เพิ่มเมื่อโหลดไม่ได้
                        pdf.setFontSize(12);
                        pdf.text(`Could not load attachment: ${path.split('/').pop()}`, margin, margin);
                    }
                    */
                    // ===== END: โค้ดเก่า =====
                }
            }
    
            pdf.save(`request-${request.RequestNumber || request.RequestID}.pdf`);
    
        } catch (err) {
            console.error("PDF Export Error: ", err);
            notification.showNotification("ไม่สามารถส่งออกเป็น PDF ได้", "error");
        } finally {
            setExporting(false);
        }
    };
    
    const renderActionSection = () => {
        if (!possibleActions || possibleActions.length === 0) {
            return null;
        }

        const groupedActions = possibleActions.reduce((acc, action) => {
            if (!acc[action.StepSequence]) {
                acc[action.StepSequence] = { actions: [], approvers: [] };
            }
            acc[action.StepSequence].actions.push(action);
            return acc;
        }, {});

        return (
            <Paper sx={{ p: 2 }} variant="outlined">
                <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                    <ThumbUpIcon sx={{ mr: 1 }} /> การดำเนินการ
                </Typography>
                <Stack spacing={2}>
                    {Object.keys(groupedActions).map(stepSequence => {
                        const actionsInStep = groupedActions[stepSequence].actions;
                        
                        const alreadyApprovedInStep = history.some(h => 
                            h.ApprovalLevel === parseInt(stepSequence, 10) && 
                            h.ApproverID === currentUser.UserID && 
                            h.ActionType !== 'ส่งกลับ/ปฏิเสธ'
                        );

                        if (alreadyApprovedInStep) {
                            return (
                                <Alert key={`step-${stepSequence}-approved`} severity="success" iconMapping={{ success: <AssignmentTurnedInIcon /> }}>
                                    คุณได้อนุมัติในขั้นตอนนี้แล้ว
                                </Alert>
                            );
                        }

                        return (
                            <Stack key={`step-${stepSequence}`} spacing={1}>
                                <Typography variant="subtitle2" sx={{fontWeight: 'bold'}}>ขั้นตอนที่ {parseInt(stepSequence, 10) + 1}</Typography>
                                {actionsInStep.map(action => (
                                    <Button
                                        key={action.ActionID}
                                        variant="contained"
                                        color={action.ActionName === 'REJECT' ? 'error' : 'primary'}
                                        fullWidth
                                        onClick={() => openActionDialog(action)}
                                        disabled={isSubmitting}
                                    >
                                        {action.ActionDisplayName}
                                    </Button>
                                ))}
                            </Stack>
                        );
                    })}
                </Stack>
            </Paper>
        );
    };
    
    const renderApprovalHistory = () => {
        if (history.length === 0) {
            return <Typography sx={{ pl: 2, color: "text.secondary" }}>ยังไม่มีประวัติการอนุมัติ</Typography>;
        }
    
        const groupedHistory = history.reduce((acc, item) => {
            // 💡 แก้ไข: ใช้ค่าที่ตรวจสอบแล้วเพื่อเป็น key
            const step = !isNaN(parseInt(item.ApprovalLevel, 10)) ? parseInt(item.ApprovalLevel, 10) : -1;
            if (!acc[step]) {
                acc[step] = [];
            }
            acc[step].push(item);
            return acc;
        }, {});
    
        const sortedStepSequences = Object.keys(groupedHistory).sort((a, b) => a - b);
    
        return (
            <List>
                {sortedStepSequences.map(stepSequence => {
                    const stepHistory = groupedHistory[stepSequence];
                    const isRejected = stepHistory.some(h => h.ActionType.includes('ส่งกลับ'));
                    
                    // 💡 START: แก้ไข Logic การกำหนดสี
                    const statusColor = isRejected ? theme.palette.error.main : theme.palette.success.main;
                    const statusIcon = isRejected ? <CancelIcon sx={{ fontSize: 16 }} /> : <CheckCircleIcon sx={{ fontSize: 16 }} />;
                    // 💡 END: แก้ไข Logic การกำหนดสี
    
                    return (
                        <ListItem key={stepSequence} disablePadding sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                    {/* 💡 แก้ไข: การแสดงผล Step ให้รองรับค่า NaN */}
                                    ขั้นตอนที่ {
                                        stepSequence !== '-1' ? parseInt(stepSequence, 10) + 1 : 'ไม่ระบุ'
                                    }: {isRejected ? 'ถูกส่งกลับ' : 'อนุมัติ'}
                                </Typography>
                            </Box>
                            <List dense disablePadding>
                                {stepHistory.map((item) => (
                                    <ListItem key={item.ApprovalID} disableGutters sx={{ py: 0.5 }}>
                                        <ListItemAvatar sx={{ minWidth: 40 }}>
                                            <Avatar sx={{ bgcolor: statusColor, width: 24, height: 24 }}>
                                                {statusIcon}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={item.FullName}
                                            secondary={
                                                <Box component="span">
                                                    <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                                                        {new Date(item.ApprovalTimestamp).toLocaleString("th-TH", thDateTimeOptions)}
                                                    </Typography>
                                                    {item.Comment && (
                                                        <Typography variant="body2" component="span" sx={{ fontStyle: "italic", mt: 0.5 }}>
                                                            "{item.Comment}"
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                            sx={{ m: 0 }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </ListItem>
                    );
                })}
            </List>
        );
    };
    
    if (loading) return <Box sx={{display: 'flex', justifyContent: 'center', mt: 4}}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!request) return <Typography>ไม่พบข้อมูลคำร้อง</Typography>;

    const isSystemErp = request.ProblemSystem && request.ProblemSystem.includes("ERP SoftPRO");
    const isSystemOther = request.ProblemSystem && request.ProblemSystem.includes("อื่นๆ");
    
    const thDateTimeOptions = { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    const thDateOptions = { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'numeric', day: 'numeric' };
    const thTimeOptions = { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };

    return (
        <>
            <Stack direction={{xs: 'column', lg: 'row'}} spacing={3} alignItems="flex-start">
                <Box sx={{ flex: 4, minWidth: 0 }}>
                    <Paper ref={formRef} id="export-form-paper" variant="outlined" sx={{ p: {xs: 1.5, sm: 3}, fontFamily: "'NotoSansThai', sans-serif", backgroundColor: '#fff' }}>
                         <motion.div>
                           <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, gap: 2 }}>
                               <Box sx={{ width: "120px", flexShrink: 0 }}> <img src={TsmLogo} alt="Company Logo" style={{ width: "100%" }} /> </Box>
                               <Box sx={{ textAlign: "center", flexGrow: 1 }}> <Typography variant="h6" sx={{ fontWeight: "bold" }}> แบบฟอร์มขอแก้ไขข้อมูลระบบ </Typography> <Box sx={{ display: "flex", justifyContent: "center" }}> <Box sx={{ width: "350px" }}> <InfoField label="สถานที่ตั้ง" value={request.LocationName} /> </Box> </Box> </Box>
                               <Box sx={{ width: "180px", flexShrink: 0, display: {xs: 'none', sm: 'block'} }}> <InfoField label="วันที่แจ้ง" value={new Date(request.RequestDate).toLocaleDateString("th-TH", thDateOptions)} /> </Box>
                           </Box>
                           <Box sx={{ display: "flex", justifyContent: "center" }}> 
                                <Box sx={{ width: "98%", p: 1 }} style = {{ display: "flex", justifyContent: "center" }} > 
                                    <Grid container spacing={{xs: 1, sm: 3}} alignItems="center"> 
                                        <Grid item xs={12} sm={6} md={4}> <InfoField label="ชื่อภาษาไทย" value={request.RequesterFullName} /> </Grid> 
                                        <Grid item xs={12} sm={6} md={3}> <InfoField label="แผนก" value={request.RequesterDepartment} /> </Grid> 
                                        <Grid item xs={12} sm={6} md={3}> <InfoField label="ตำแหน่ง" value={request.RequesterPosition} /> </Grid> 
                                        <Grid item xs={12} sm={6} md={2}> <InfoField label="โทรศัพท์" value={request.PhoneNumber} /> </Grid> 
                                    </Grid> 
                                </Box> 
                           </Box>
                        </motion.div>
                        <motion.div>
                           <Box sx={{ border: "1px solid #ccc", p: 2, mt: 2 }}>
                               <Box sx={{ mb: 2 }}> 
                                 <Typography variant="body1" sx={{ fontWeight: "bold" }}> รายละเอียดในการแก้ไขข้อมูลระบบ </Typography> 
                                 <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ my: 1, pl: 2 }}> 
                                   <CheckboxDisplay label="ระบบ ERP Softpro" checked={isSystemErp} /> 
                                   <Box sx={{ display: "flex", flexGrow: 1, alignItems: "center" }}> 
                                     <CheckboxDisplay label="อื่นๆ (ระบุ)" checked={isSystemOther} /> 
                                     {isSystemOther && ( <Typography sx={{ ml: 1, borderBottom: "1px dotted #000", flexGrow: 1 }}> {request.ProblemReason} </Typography> )} 
                                   </Box> 
                                 </Stack> 
                               </Box>
                               <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
                                   <Box sx={{ flexGrow: 1, minWidth: 0 }}> 
                                       <Typography variant="body1" sx={{ fontWeight: "bold" }}> ระบุรายละเอียดของปัญหา </Typography> 
                                       <Box sx={{ p: 1, mt: 1, minHeight: 250, whiteSpace: "pre-wrap", border: "1px solid #eee", borderRadius: 1, backgroundColor: "#fafafa", wordBreak: 'break-word' }}>
                                           <Typography variant="body2">{request.ProblemDetail}</Typography>
                                       </Box>
                                       <Box sx={{ mt: 2 }}>
                                            <Typography variant="body1" sx={{ fontWeight: "bold" }}> เหตุผลในการแก้ไข: <Box component="span" sx={{ fontWeight: 'normal' }}>{request.ReasonText || 'N/A'}</Box></Typography>
                                       </Box>
                                   </Box>
                                   <Box sx={{ flexShrink: 0, width: { xs: "100%", md: "250px" } }}> 
                                      <Stack spacing={4} sx={{ pt: 4 }}> 
                                        <InfoField label="ผู้ขอ" value={requesterSignature} /> 
                                        <InfoField label="ผู้ตรวจสอบ" value={reviewerSignature} /> 
                                        <InfoField label="ผู้ตรวจสอบ (บัญชี)" value={accountantSignature} /> 
                                        <InfoField label="ผู้อนุมัติ" value={finalApproverSignature} /> 
                                      </Stack> 
                                   </Box>
                               </Box>
                           </Box>
                        </motion.div>
                        <motion.div> <Typography variant="caption" display="block" sx={{ mt: 1 }}> หมายเหตุ : สำนักงานกรุงเทพ ผู้ตรวจสอบ = ผู้จัดการฝ่าย // โรงงาน ผู้ตรวจสอบ = หน.แผนก/ผช.ผู้จัดการฝ่าย, ผู้อนุมัติ = ผู้จัดการฝ่าย/รองผู้อำวยการโรงงาน/ผู้จัดการโรงงาน </Typography> </motion.div>
                        <motion.div>
                           <Box sx={{ border: "1px solid #ccc", p: 2, mt: 2 }}>
                               <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                                   <Box sx={{ flex: "1 1 400px" }}> 
                                       <Typography variant="h6" sx={{ fontWeight: "bold" }}> ส่วนเทคโนโลยีสารสนเทศ </Typography> 
                                       <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}> <Box sx={{ display: "flex", gap: { xs: 2, sm: 5 } }}> <Box sx={{ width: "160px" }}> <InfoField label="ผู้อนุมัติ" value={itApproverSignature} /> </Box> <Box sx={{ width: "160px" }}> <InfoField label="ผู้แก้ไข" value={itOperatorSignature} /> </Box> </Box> </Box>
                                       <Box sx={{mt: 1}}>
                                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>ปัญหา/อุปสรรค (ถ้ามี):</Typography>
                                          <Box sx={{ p: 1, mt: 0.5, minHeight: 50, whiteSpace: "pre-wrap", border: "1px solid #eee", borderRadius: 1, backgroundColor: "#fafafa", wordBreak: 'break-word' }}>
                                               <Typography variant="body2">{request.IT_Obstacles || '-'}</Typography>
                                          </Box>
                                       </Box>
                                   </Box>
                                   <Box sx={{ flex: { xs: "1 1 100%", md: "0 0 250px" }, border: "1px solid #b3e5fc", backgroundColor: "#e1f5fe", p: 1.5, borderRadius: 1 }}> <InfoField label="หมายเลขที่งาน" value={request.RequestNumber} /> <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}> <InfoField label="วันที่แก้ไข" value={ request.IT_CompletedAt ? new Date( request.IT_CompletedAt ).toLocaleDateString("th-TH", thDateOptions) : "" } /> <InfoField label="เวลา" value={ request.IT_CompletedAt ? new Date( request.IT_CompletedAt ).toLocaleTimeString("th-TH", thTimeOptions) : "" } /> </Box> </Box>
                               </Box>
                           </Box>
                        </motion.div>
                        <div id="attachment-section-web">
                            {request.AttachmentPath && request.AttachmentPath.length > 0 && (
                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="h6">ไฟล์แนบ</Typography>
                                    <Divider sx={{ my: 1 }} />
                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1 }}>
                                        {request.AttachmentPath.map((path, index) => (
                                            <FileAttachment key={index} path={path} baseUrl={IMAGE_URL} />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </div>
                    </Paper>
                </Box>
                
                <Box sx={{ flex: 1, minWidth: "320px", position: "sticky", top: "88px", width: '100%' }}>
                    <Stack spacing={3}>
                        {renderActionSection()}
                        <Paper sx={{ p: 2 }} variant="outlined">
                            <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}><HistoryIcon sx={{ mr: 1 }} /> ประวัติการอนุมัติ</Typography>
                            {renderApprovalHistory()}
                        </Paper>
                    </Stack>
                </Box>
            </Stack>

            <Button id="export-pdf-button" variant="contained" color="secondary" onClick={handleExportPdf} disabled={exporting} sx={{ position: "fixed", bottom: 24, right: 24, borderRadius: "16px", p: "12px 24px", fontFamily: "'NotoSansThai', sans-serif" }} startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />}>
                {exporting ? "กำลังส่งออก..." : "ส่งออกเป็น PDF"}
            </Button>
            
            <Dialog open={dialog.open} onClose={() => setDialog({ open: false, action: null })} fullWidth maxWidth="sm">
                 <DialogTitle>ยืนยันการ "{dialog.action?.ActionDisplayName}"</DialogTitle>
                 <DialogContent>
                     <DialogContentText sx={{ mb: 2 }}>
                         คุณต้องการดำเนินการ "{dialog.action?.ActionDisplayName}" สำหรับคำร้องนี้ใช่หรือไม่?
                     </DialogContentText>
                     
                     {dialog.action?.ActionName === 'IT_PROCESS' && (
                         <Stack spacing={2} sx={{mt: 2}}>
                            <TextField label="ผู้แก้ไข" value={itData.operatorName} onChange={(e) => setItData({ ...itData, operatorName: e.target.value })} fullWidth required disabled={isSubmitting}/>
                            
                            <DateTimePicker
                                label="วัน / เวลาแก้ไข"
                                value={itData.completedAt}
                                onChange={(newValue) => setItData({ ...itData, completedAt: newValue })}
                                ampm={false}
                                slotProps={{ textField: { fullWidth: true, required: true, disabled: isSubmitting } }}
                            />

                            <TextField label="อุปสรรค (ถ้ามี)" value={itData.obstacles} onChange={(e) => setItData({ ...itData, obstacles: e.target.value })} fullWidth multiline rows={2} disabled={isSubmitting}/>
                            
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={requiresCCS}
                                        onChange={(e) => setRequiresCCS(e.target.checked)}
                                        disabled={isSubmitting}
                                    />
                                }
                                label="จำเป็นต้องแจ้งปิด CCS"
                            />
                         </Stack>
                     )}
                     
                     {['APPROVE', 'REJECT', 'CONFIRM_COMPLETE', 'CCS_CLOSE'].includes(dialog.action?.ActionName) && (
                         <TextField
                             autoFocus={dialog.action?.ActionName === 'REJECT'}
                             required={dialog.action?.ActionName === 'REJECT'}
                             margin="dense"
                             id="comment"
                             label={dialog.action?.ActionName === 'REJECT' ? "เหตุผลในการปฏิเสธ" : "หมายเหตุ (ถ้ามี)"}
                             type="text"
                             fullWidth
                             multiline
                             rows={4}
                             variant="outlined"
                             value={comment}
                             onChange={(e) => setComment(e.target.value)}
                             disabled={isSubmitting}
                         />
                     )}
                 </DialogContent>
                 <DialogActions>
                     <Button onClick={() => setDialog({ open: false, action: null })} disabled={isSubmitting}>ยกเลิก</Button>
                     <Button 
                        onClick={handlePerformAction} 
                        color={dialog.action?.ActionName === 'REJECT' ? 'error' : 'primary'} 
                        variant="contained"
                        disabled={isSubmitting}
                     >
                        {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
                     </Button>
                 </DialogActions>
            </Dialog>
        </>
    );
};

export default RequestDetailPage;