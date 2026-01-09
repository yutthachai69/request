// backend/src/controllers/requestController.js
const { getPool, sql } = require('../config/db');
const Request = require('../models/requestModel');
const Permission = require('../models/permissionModel');
const ExcelJS = require('exceljs');
const ApprovalHistory = require('../models/approvalHistoryModel');
const asyncHandler = require('../utils/asyncHandler');
const workflowHelper = require('../utils/workflowHelper');
const { getCurrentBangkokTime } = require('../utils/dateHelper');
const User = require('../models/userModel');
const AuditLog = require('../models/auditLogModel');
const { notifyNextApprovers, findNextApprovers } = require('../utils/workflowHelper');

const transformRequestPaths = (request) => {
    
    if (!request) return null;
    if (request.AttachmentPath) {
        try {
            const relativePaths = JSON.parse(request.AttachmentPath);
            request.AttachmentPath = relativePaths.map(p => {
                return p.replace(/\\/g, '/');
            });
        } catch (e) {
            console.error('Failed to parse AttachmentPath JSON:', request.AttachmentPath);
            request.AttachmentPath = [];
        }
    }
    return request;
};

const getRequestData = async (requestId, user) => {
    
    let request = await Request.findById(requestId);
    if (!request) {
        return null;
    }

    request = transformRequestPaths(request);
    const correctionTypesResult = await Request.getRequestCorrectionTypes(requestId);
    const correctionTypeIds = correctionTypesResult.map(t => t.CorrectionTypeID);

    const primaryActions = await Request.findPossibleTransitions(request.CategoryID, correctionTypeIds, request.CurrentStatusID, user.RoleID);
    
    const specialRoles = await getPool().request().input('userId', sql.Int, user.UserID).query('SELECT RoleID FROM UserSpecialRoles WHERE UserID = @userId');
    const userSpecialRoleIds = specialRoles.recordset.map(r => r.RoleID);
    
    let specialActions = [];
    if (userSpecialRoleIds.length > 0) {
        for (const roleId of userSpecialRoleIds) {
            const actions = await Request.findPossibleTransitions(request.CategoryID, correctionTypeIds, request.CurrentStatusID, roleId);
            specialActions.push(...actions);
        }
    }

    const possibleActions = [...primaryActions, ...specialActions].filter((v, i, a) => a.findIndex(t => (t.ActionID === v.ActionID)) === i);
    
    const historyData = await ApprovalHistory.getForRequest(requestId);
    
    return { request, history: historyData, possibleActions };
};

const emitNotificationEvent = (io, eventName, data) => {
    io.emit(eventName, data);
};

exports.createRequest = asyncHandler(async (req, res) => {
    
    const { 
        categoryId, locationId, requestDate, 
        reasonId, correctionTypeIds,
        problemSystem, problemReason
    } = req.body;
    const requesterId = req.user.UserID;

    const hasPermission = await Permission.check(requesterId, categoryId);
    if (!hasPermission) {
        res.status(403);
        throw new Error('คุณไม่มีสิทธิ์สร้างคำร้องในหมวดหมู่นี้');
    }
    
    const attachmentPaths = req.files ? req.files.map(file => `uploads/${file.filename}`) : [];
    const attachmentPathJson = JSON.stringify(attachmentPaths);
    
    const parsedCorrectionTypeIds = JSON.parse(correctionTypeIds || '[]');
    if (parsedCorrectionTypeIds.length === 0) {
        res.status(400);
        throw new Error('กรุณาเลือกประเภทการแก้ไขอย่างน้อยหนึ่งรายการ');
    }
    
    const newRequestData = await Request.create({
        requesterId,
        categoryId,
        locationId: locationId || null,
        requestDate,
        problemDetail: req.body.problemDetail,
        attachmentPath: attachmentPaths.length > 0 ? attachmentPathJson : null,
        reasonId: reasonId || null,
        correctionTypeIds: parsedCorrectionTypeIds,
        problemSystem: problemSystem,
        problemReason: problemReason || null,
    });
    
    const fullNewRequest = await Request.findById(newRequestData.RequestID);

    const nextApprovers = await workflowHelper.notifyNextApprovers(fullNewRequest, fullNewRequest.CurrentStatusID);

    const io = req.app.get('io');
    if (io) {
        emitNotificationEvent(io, 'new_request', {
            message: 'มีคำร้องใหม่ถูกสร้าง',
            requestId: fullNewRequest.RequestID,
            categoryName: fullNewRequest.CategoryName,
            nextApprovers: nextApprovers.map(a => a.fullName),
        });
    }

    res.status(201).json({ 
        message: 'สร้างคำร้องสำเร็จ', 
        request: newRequestData,
        nextApprovers: nextApprovers 
    });
});

exports.updateRequest = asyncHandler(async (req, res) => {
    
    const { id } = req.params;
    const request = await Request.findById(id);

    if (!request) {
        res.status(404);
        throw new Error('ไม่พบข้อมูลคำร้อง');
    }

    const isOwner = request.RequesterID === req.user.UserID;
    const isEditableStatus = ['PENDING_HOD', 'REVISION_REQUIRED'].includes(request.StatusCode);

    if (!isOwner || !isEditableStatus) {
        res.status(403);
        throw new Error('คุณไม่ได้รับอนุญาตให้อัปเดตคำร้องในสถานะปัจจุบัน');
    }

    const { problemDetail, existingAttachments, correctionTypeIds } = req.body;
    const parsedCorrectionTypeIds = JSON.parse(correctionTypeIds || '[]');
    if (parsedCorrectionTypeIds.length === 0) {
        res.status(400);
        throw new Error('กรุณาเลือกประเภทการแก้ไขอย่างน้อยหนึ่งรายการ');
    }

    const newAttachmentPaths = req.files ? req.files.map(file => `uploads/${file.filename}`) : [];
    const currentAttachmentPaths = JSON.parse(existingAttachments || '[]');
    const finalAttachmentPaths = [...currentAttachmentPaths, ...newAttachmentPaths];

    const updateData = {
        ProblemDetail: problemDetail,
        AttachmentPath: JSON.stringify(finalAttachmentPaths),
        correctionTypeIds: parsedCorrectionTypeIds
    };

    const wasRevisionRequired = request.StatusCode === 'REVISION_REQUIRED';
    let initialStatusId = null;
    let nextApprovers = []; 

    if (wasRevisionRequired) {
        const pool = getPool();
        const initialStatusResult = await pool.request().query("SELECT StatusID FROM Statuses WHERE IsInitialState = 1");
        if (initialStatusResult.recordset.length > 0) {
            initialStatusId = initialStatusResult.recordset[0].StatusID;
            updateData.CurrentStatusID = initialStatusId;
        } else {
            throw new Error('ไม่พบสถานะเริ่มต้นในระบบ ไม่สามารถส่งกลับไปอนุมัติได้');
        }
    }

    await Request.update(id, updateData);
    
    if (wasRevisionRequired && initialStatusId) {
        const updatedRequest = await Request.findById(id);
        nextApprovers = await workflowHelper.notifyNextApprovers(updatedRequest, initialStatusId);
    }
    
    const io = req.app.get('io');
    if (io) {
        emitNotificationEvent(io, 'request_updated', {
            message: `คำร้อง #${request.RequestNumber || request.RequestID} ถูกแก้ไข`,
            requestId: request.RequestID,
            nextApprovers: nextApprovers.map(a => a.fullName),
        });
    }

    res.json({ message: 'อัปเดตคำร้องสำเร็จ', nextApprovers: nextApprovers });
});

exports.getApprovalHistory = asyncHandler(async (req, res) => {
    
    const { UserID: approverId } = req.user;
    const { categoryId, search, page, limit } = req.query;
    
    const data = await Request.getHistoryByApprover(approverId, categoryId, search, parseInt(page, 10), parseInt(limit, 10));
    
    res.status(200).json({
        requests: data.requests,
        totalCount: data.totalCount,
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(data.totalCount / limit)
    });
});

exports.getRequests = asyncHandler(async (req, res) => {
    
    const { RoleID: userRoleId, UserID: userId, DepartmentID: userDepartmentId } = req.user;
    const { status, search, categoryId, approvedByMe, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    const data = await Request.getRequestsByRole({ 
        userRoleId, 
        userId, 
        status, 
        search, 
        categoryId, 
        approvedByMe: approvedByMe === 'true',
        startDate,
        endDate,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        userDepartmentId
    });

    const isPendingView = status !== 'PROCESSED,COMPLETED' && !(approvedByMe === 'true');

    if (isPendingView && data.requests.length > 0) {
        for (let i = 0; i < data.requests.length; i++) {
            const request = data.requests[i];
            const fullRequestDetails = await Request.findById(request.RequestID);
            if (fullRequestDetails) {
                 const nextApprovers = await findNextApprovers(fullRequestDetails);
                 data.requests[i].NextApprovers = nextApprovers;
            } else {
                 data.requests[i].NextApprovers = [];
            }
        }
    }

    const transformedRequests = data.requests.map(transformRequestPaths);
    res.status(200).json({
        requests: transformedRequests,
        totalCount: data.totalCount,
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(data.totalCount / limit)
    });
});

exports.getRequestById = asyncHandler(async (req, res) => {
    
    const { id } = req.params;
    const data = await getRequestData(id, req.user);

    if (!data) {
        res.status(404);
        throw new Error('ไม่พบข้อมูลคำร้อง');
    }
    
    const { request, history, possibleActions } = data;

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

    const responseData = {
        request,
        history,
        possibleActions,
        signatures: {
            requester: requesterSignature,
            reviewer: reviewerSignature,
            accountant: accountantSignature,
            finalApprover: finalApproverSignature,
            itReviewer: itApproverSignature,
            itOperator: itOperatorSignature
        }
    };
    
    res.json(responseData);
});

exports.performAction = asyncHandler(async (req, res) => {
    
    const { id: requestId } = req.params;
    const { actionName, comment } = req.body;
    const { UserID: actorId } = req.user;

    const requestData = await getRequestData(requestId, req.user);
    if (!requestData) {
        res.status(404);
        throw new Error('ไม่พบข้อมูลคำร้อง');
    }
    
    const correctionTypesResult = await Request.getRequestCorrectionTypes(requestId);
    const correctionTypeIds = correctionTypesResult.map(t => t.CorrectionTypeID);
    
    const validAction = requestData.possibleActions.find(a => a.ActionName === actionName);

    if (!validAction) {
        res.status(403);
        throw new Error('คุณไม่มีสิทธิ์ดำเนินการนี้ หรือ Action นี้ไม่สามารถทำได้ในสถานะปัจจุบัน');
    }
    
    const transaction = new sql.Transaction(getPool());
    try {
        await transaction.begin();

        let finalNextStatusId = validAction.NextStatusID;
        let finalNextStatusName = validAction.NextStatusName;

        if (actionName !== 'REJECT' && actionName !== 'IT_PROCESS') {
            const allTransitions = await Request.findTransitionsByCurrentStatus(requestData.request.CategoryID, correctionTypeIds, requestData.request.CurrentStatusID);
            const thisStepTransitions = allTransitions.filter(t => t.StepSequence === validAction.StepSequence && t.ActionName !== 'REJECT');

            if (thisStepTransitions.length > 1) {
                await ApprovalHistory.create({
                    requestId,
                    approverId: actorId,
                    actionType: validAction.ActionDisplayName,
                    comment: comment || null,
                    transaction,
                    approvalLevel: validAction.StepSequence
                });
                
                const { allApproved } = await Request.checkParallelApprovalsCompleted(requestId, requestData.request.CurrentStatusID, validAction.StepSequence);
                
                if (!allApproved) {
                    await transaction.commit();
                    
                    const requester = await User.findById(requestData.request.RequesterID);
                    const nextApprovers = await workflowHelper.notifyNextApprovers(requestData.request, validAction.NextStatusID);

                    await AuditLog.create({
                        userId: actorId,
                        action: 'REQUEST_PARALLEL_APPROVED',
                        detail: `ผู้ใช้ ${req.user.FullName} อนุมัติคำร้อง ${requestId} ในขั้นตอนที่ ${validAction.StepSequence} แต่ยังรอผู้อนุมัติคนอื่น`,
                        ipAddress: req.ip
                    });
                    
                    const io = req.app.get('io');
                    if (io) {
                         emitNotificationEvent(io, 'parallel_approval_pending', {
                            message: `คำร้อง #${requestData.request.RequestNumber || requestId} รอผู้อนุมัติในขั้นตอนเดียวกัน`,
                            requestId: requestId,
                            currentStep: validAction.StepSequence,
                        });
                    }


                    return res.json({ 
                        message: `ดำเนินการ '${validAction.ActionDisplayName}' สำเร็จ, ยังรอผู้อนุมัติคนอื่นในขั้นตอนเดียวกัน`,
                        nextApprovers: nextApprovers
                    });
                }
            }
        }

        const updatePayload = {};

        if (actionName === 'IT_PROCESS') {
            const currentRequest = requestData.request;
            updatePayload.IT_OperatorName = req.body.itData?.operatorName || req.user.FullName;
            updatePayload.IT_CompletedAt = req.body.itData?.completedAt ? new Date(req.body.itData.completedAt) : new Date();
            updatePayload.IT_Obstacles = req.body.itData?.obstacles || null;

            const requiresCCS = req.body.itData?.requiresCCS || false;
            
            const pool = getPool();
            if (requiresCCS && currentRequest.RequiresCCSClosing) {
                const ccsStatusResult = await new sql.Request(transaction).query("SELECT StatusID, StatusName FROM Statuses WHERE StatusCode = 'PENDING_CCS_CLOSE'");
                if (ccsStatusResult.recordset.length > 0) {
                    finalNextStatusId = ccsStatusResult.recordset[0].StatusID;
                    finalNextStatusName = ccsStatusResult.recordset[0].StatusName;
                } else {
                    throw new Error('ไม่พบสถานะ "PENDING_CCS_CLOSE" ในระบบ');
                }
            } else {
                const reviewStatusResult = await new sql.Request(transaction).query("SELECT StatusID, StatusName FROM Statuses WHERE StatusCode = 'PENDING_IT_REVIEW'");
                if (reviewStatusResult.recordset.length > 0) {
                    finalNextStatusId = reviewStatusResult.recordset[0].StatusID;
                    finalNextStatusName = reviewStatusResult.recordset[0].StatusName;
                } else {
                    throw new Error('ไม่พบสถานะ "PENDING_IT_REVIEW" ในระบบ');
                }
            }

            const requestInfo = await new sql.Request(transaction).input('reqId', sql.Int, requestId).query('SELECT CategoryID, RequestDate FROM Requests WHERE RequestID = @reqId');
            const { CategoryID, RequestDate } = requestInfo.recordset[0];
            const christianYear = new Date(RequestDate).getFullYear();
            const buddhistYear = christianYear + 543; // ✅ แปลงค.ศ. เป็นพ.ศ.

            // ✅ ตรวจสอบว่ามีการตั้งค่าเลขที่เอกสารหรือไม่ (รองรับการคร่อมปี)
            // ตรวจสอบปีปัจจุบันก่อน (พ.ศ.)
            let configResult = await new sql.Request(transaction)
                .input('catId', sql.Int, CategoryID)
                .input('year', sql.Int, buddhistYear)
                .query(`SELECT ConfigID, Prefix, LastRunningNumber FROM DocumentNumberConfig WITH (UPDLOCK) WHERE CategoryID = @catId AND Year = @year`);
            
            // ✅ ถ้าไม่พบ config สำหรับปีปัจจุบัน ให้ตรวจสอบปีก่อนหน้า (รองรับการคร่อมปี)
            // เช่น ถ้าตั้งค่า 2568-2569 และตอนนี้เป็นปี 2569 จะใช้ config ของ 2568
            if (configResult.recordset.length === 0) {
                const previousYear = buddhistYear - 1;
                configResult = await new sql.Request(transaction)
                    .input('catId', sql.Int, CategoryID)
                    .input('year', sql.Int, previousYear)
                    .query(`SELECT ConfigID, Prefix, LastRunningNumber FROM DocumentNumberConfig WITH (UPDLOCK) WHERE CategoryID = @catId AND Year = @year`);
            }

            // ✅ ต้องตั้งค่าใน Admin ก่อน เพื่อป้องกันเลขที่เอกสารไม่ตรงกัน
            if (configResult.recordset.length === 0) {
                // ดึงชื่อหมวดหมู่เพื่อแสดงใน error message
                const categoryResult = await new sql.Request(transaction).input('catId', sql.Int, CategoryID).query('SELECT CategoryName FROM Categories WHERE CategoryID = @catId');
                const categoryName = categoryResult.recordset[0]?.CategoryName || `หมวดหมู่ ID: ${CategoryID}`;
                
                throw new Error(
                    `ไม่พบการตั้งค่าเลขที่เอกสารสำหรับ "${categoryName}" ปี ${buddhistYear} (หรือปี ${buddhistYear - 1}) ` +
                    `กรุณาไปตั้งค่าที่หน้า "ตั้งค่าเลขที่เอกสาร" ในเมนู Admin ก่อนดำเนินการ`
                );
            }
            
            const config = configResult.recordset[0];
            const newRunningNumber = config.LastRunningNumber + 1;
            const requestNumber = `${config.Prefix}${String(newRunningNumber).padStart(4, '0')}`;

            await new sql.Request(transaction).input('newNum', sql.Int, newRunningNumber).input('configId', sql.Int, config.ConfigID).query('UPDATE DocumentNumberConfig SET LastRunningNumber = @newNum WHERE ConfigID = @configId');
            updatePayload.RequestNumber = requestNumber;
        }
        
        updatePayload.CurrentStatusID = finalNextStatusId;
        
        const updateRequest = new sql.Request(transaction);
        let setClauses = Object.keys(updatePayload).map(key => `${key} = @${key}`);
        setClauses.push('UpdatedAt = @updatedAt');
        
        updateRequest.input('id', sql.Int, requestId);
        updateRequest.input('updatedAt', sql.DateTime2, getCurrentBangkokTime());
        for (const key in updatePayload) {
            let type = sql.NVarChar;
            if (key.endsWith('ID')) type = sql.Int;
            if (key.endsWith('At')) type = sql.DateTime2;
            updateRequest.input(key, type, updatePayload[key]);
        }
        await updateRequest.query(`UPDATE Requests SET ${setClauses.join(', ')} WHERE RequestID = @id`);

        await ApprovalHistory.create({
            requestId,
            approverId: actorId,
            actionType: validAction.ActionDisplayName,
            comment: comment || null,
            transaction,
            approvalLevel: validAction.StepSequence
        });
        
        await transaction.commit();
        
        const updatedRequest = await Request.findById(requestId);
        
        const requester = await User.findById(updatedRequest.RequesterID);
        
        let nextApprovers = []; 
        let emailInfo = { shouldSend: false, templateName: '', recipient: null }; 

        if (finalNextStatusName === 'รอการแก้ไข') {
            await workflowHelper.notifyRequester(
                updatedRequest.RequesterID,
                updatedRequest.RequestID,
                `แจ้งเพื่อแก้ไข: คำร้อง #${updatedRequest.RequestNumber || updatedRequest.RequestID} ของคุณถูกส่งกลับ`
            );
            if (requester && requester.Email) {
                emailInfo = { shouldSend: true, templateName: 'RevisionRequired', recipient: requester };
            }
        } else if (finalNextStatusName === 'เสร็จสิ้น') {
            await workflowHelper.notifyRequester(
                updatedRequest.RequesterID,
                updatedRequest.RequestID,
                `เสร็จสิ้น: คำร้อง #${updatedRequest.RequestNumber || updatedRequest.RequestID} ของคุณดำเนินการเสร็จแล้ว`
            );
            if (requester && requester.Email) {
                emailInfo = { shouldSend: true, templateName: 'RequestCompleted', recipient: requester };
            }
        } else {
            nextApprovers = await workflowHelper.notifyNextApprovers(updatedRequest, finalNextStatusId);
        }
        
        await AuditLog.create({
            userId: actorId,
            action: 'REQUEST_STATUS_CHANGED',
            detail: `คำร้อง ${requestId} เปลี่ยนสถานะเป็น ${finalNextStatusName} โดย ${req.user.FullName}`,
            ipAddress: req.ip
        });

        const io = req.app.get('io');
        if (io) {
            emitNotificationEvent(io, 'request_status_changed', {
                message: `คำร้อง #${updatedRequest.RequestNumber || updatedRequest.RequestID} เปลี่ยนสถานะเป็น ${finalNextStatusName}`,
                requestId: updatedRequest.RequestID,
                newStatus: finalNextStatusName,
                nextApprovers: nextApprovers.map(a => a.fullName),
            });
        }


        res.json({ 
            message: `ดำเนินการ '${validAction.ActionDisplayName}' สำเร็จ`,
            nextApprovers: nextApprovers,
            requesterInfo: emailInfo.shouldSend ? { email: emailInfo.recipient.Email, fullName: emailInfo.recipient.FullName } : null,
            emailTemplate: emailInfo.templateName,
            requestData: {
                requestId: updatedRequest.RequestID,
                requestNumber: updatedRequest.RequestNumber || updatedRequest.RequestID,
                requesterName: updatedRequest.RequesterFullName,
                categoryName: updatedRequest.CategoryName,
            }
        });

    } catch (err) {
        await transaction.rollback();
        console.error("Perform action error:", err);
        throw err;
    }
});

exports.performBulkAction = asyncHandler(async (req, res) => {
    const { requestIds, actionName, comment } = req.body;
    const { UserID: actorId, FullName: actorFullName } = req.user;

    if (!Array.isArray(requestIds) || requestIds.length === 0 || !actionName) {
        return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง: ต้องมี requestIds และ actionName" });
    }

    let successCount = 0;
    let failCount = 0;
    const failedRequests = [];

    for (const requestId of requestIds) {
        const transaction = new sql.Transaction(getPool());
        try {
            const requestData = await getRequestData(requestId, req.user);
            if (!requestData) {
                failCount++;
                failedRequests.push({ id: requestId, reason: 'ไม่พบคำร้อง' });
                continue;
            }

            const validAction = requestData.possibleActions.find(a => a.ActionName === actionName);
            if (!validAction) {
                failCount++;
                failedRequests.push({ id: requestId, reason: 'ไม่มีสิทธิ์ดำเนินการในสถานะปัจจุบัน' });
                continue;
            }

            await transaction.begin();

            await new sql.Request(transaction)
                .input('id', sql.Int, requestId)
                .input('NextStatusID', sql.Int, validAction.NextStatusID)
                .input('updatedAt', sql.DateTime2, getCurrentBangkokTime())
                .query('UPDATE Requests SET CurrentStatusID = @NextStatusID, UpdatedAt = @updatedAt WHERE RequestID = @id');

            await ApprovalHistory.create({
                requestId,
                approverId: actorId,
                actionType: validAction.ActionDisplayName,
                comment: comment || `Bulk Action: ${validAction.ActionDisplayName}`,
                transaction,
                approvalLevel: validAction.StepSequence
            });

            await transaction.commit();

            const updatedRequest = await Request.findById(requestId);
            if(updatedRequest) {
                await notifyNextApprovers(updatedRequest, validAction.NextStatusID);
            }
            
            successCount++;

        } catch (err) {
            await transaction.rollback();
            failCount++;
            failedRequests.push({ id: requestId, reason: err.message });
            console.error(`Bulk action failed for request ${requestId}:`, err);
        }
    }

    await AuditLog.create({
        userId: actorId,
        action: 'REQUEST_BULK_ACTION',
        detail: `[${actionName}] ${successCount} คำร้องสำเร็จ, ${failCount} คำร้องล้มเหลว โดย ${actorFullName}`,
        ipAddress: req.ip
    });

    res.status(200).json({
        message: `ดำเนินการสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`,
        successCount,
        failCount,
        failedRequests
    });
});

exports.deleteRequest = asyncHandler(async (req, res) => {
    
    const request = await Request.findById(req.params.id);
    if (!request) {
        res.status(404);
        throw new Error('ไม่พบข้อมูลคำร้อง');
    }

    const isOwner = req.user.UserID === request.RequesterID;
    const isAdmin = req.user.RoleName === 'Admin';
    const isDeletableStatus = ['PENDING_HOD', 'REVISION_REQUIRED'].includes(request.StatusCode);

    if (!isAdmin && !(isOwner && isDeletableStatus)) {
        res.status(403);
        throw new Error('คุณไม่มีสิทธิ์ลบคำร้องนี้ในสถานะปัจจุบัน');
    }

    await Request.deleteById(req.params.id);
    
    await AuditLog.create({
        userId: req.user.UserID,
        action: 'REQUEST_DELETED',
        detail: `ผู้ใช้ ${req.user.FullName} ลบคำร้อง ${req.params.id}`,
        ipAddress: req.ip
    });
    
    const io = req.app.get('io');
    if (io) {
        emitNotificationEvent(io, 'request_deleted', {
            message: `คำร้อง #${request.RequestNumber || request.RequestID} ถูกลบ`,
            requestId: request.RequestID,
        });
    }

    res.json({ message: 'ลบคำร้องสำเร็จ' });
});

exports.exportRequests = asyncHandler(async (req, res) => {
    
    const { RoleID: userRoleId, UserID: userId } = req.user;
    const { status, search, categoryId, startDate, endDate } = req.query;

    const {requests} = await Request.getRequestsByRole({
        userRoleId,
        userId,
        status,
        search,
        categoryId,
        isExport: true,
        startDate,
        endDate
    });

    if (requests.length === 0) {
        res.status(404);
        throw new Error('ไม่พบข้อมูลสำหรับส่งออก');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Requests');
    worksheet.columns = [
        { header: 'เลขที่เอกสาร', key: 'RequestNumber', width: 20 },
        { header: 'วันที่แจ้ง', key: 'RequestDate', width: 15 },
        { header: 'ผู้แจ้ง', key: 'RequesterName', width: 25 },
        { header: 'แผนก', key: 'RequesterDepartment', width: 20 },
        { header: 'หมวดหมู่', key: 'CategoryName', width: 20 },
        { header: 'สถานที่', key: 'LocationName', width: 15 },
        { header: 'รายละเอียด', key: 'ProblemDetail', width: 50 },
        { header: 'สถานะ', key: 'StatusName', width: 20 },
        { header: 'ผู้ดำเนินการ (IT)', key: 'IT_OperatorName', width: 25 },
        { header: 'ผู้ปิดงาน (IT)', key: 'ITCloserName', width: 25 },
        { header: 'วันที่ดำเนินการเสร็จ', key: 'IT_CompletedAt', width: 20 },
        { header: 'อุปสรรค', key: 'IT_Obstacles', width: 40 },
    ];

    const formattedRequests = requests.map(r => ({
        ...r,
        RequestDate: r.RequestDate ? new Date(r.RequestDate) : null,
        IT_CompletedAt: r.IT_CompletedAt ? new Date(r.IT_CompletedAt) : null
    }));

    worksheet.addRows(formattedRequests);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="requests-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
});

exports.getRequestCorrectionTypes = asyncHandler(async (req, res) => {
    
    const types = await Request.getRequestCorrectionTypes(req.params.id);
    res.json(types);
});