// backend/src/utils/workflowHelper.js
const Request = require('../models/requestModel');
const Permission = require('../models/permissionModel');
const Notification = require('../models/notificationModel');
const Admin = require('../models/adminModel');
const User = require('../models/userModel');
const MasterData = require('../models/masterDataModel');

const findNextApprovers = async (request) => {
    // This function finds the next approvers without sending notifications.
    const correctionTypesResult = await Request.getRequestCorrectionTypes(request.RequestID);
    
    const allTransitions = await Request.findTransitionsByCurrentStatus(
        request.CategoryID,
        correctionTypesResult.map(t => t.CorrectionTypeID),
        request.CurrentStatusID // Use CurrentStatusID to find the next step
    );
    
    if (allTransitions.length === 0) {
        return [];
    }
    
    const nextStepSequence = allTransitions[0].StepSequence;
    const nextTransitions = allTransitions.filter(t => t.StepSequence === nextStepSequence);
    
    const nextRequiredRoleIds = [...new Set(nextTransitions.map(t => t.RequiredRoleID))];
    let approvers = [];
    const activeCorrectionTypeId = correctionTypesResult.length > 0 ? correctionTypesResult[0].CorrectionTypeID : null;
    
    const specialMappings = await Admin.getSpecialApproverMappings(request.CategoryID, activeCorrectionTypeId);
    const stepSpecificUserIds = specialMappings
        .filter(m => m.StepSequence === nextStepSequence)
        .map(m => m.UserID);

    if (stepSpecificUserIds.length > 0) {
        const userDetails = await Promise.all(stepSpecificUserIds.map(id => User.findById(id)));
        approvers = userDetails.filter(u => u && u.IsActive);
    } else {
        for (const roleId of nextRequiredRoleIds) {
            const transitionRule = nextTransitions.find(t => t.RequiredRoleID === roleId);
            if (!transitionRule) continue;
            
            const roleBasedUsers = await Permission.findUsersByRoleAndCategory(
                roleId,
                request.CategoryID,
                transitionRule.FilterByDepartment || false,
                request.RequesterDepartmentID
            );
            
            const fullUserInfos = await Promise.all(roleBasedUsers.map(u => User.findById(u.UserID)));
            approvers.push(...fullUserInfos.filter(Boolean));
        }
    }

    const uniqueApprovers = [...new Map(approvers.map(item => [item["UserID"], item])).values()];
    
    return uniqueApprovers.map(u => u.FullName); // Return an array of names
}


const notifyNextApprovers = async (request, nextStatusId) => {
    const correctionTypesResult = await Request.getRequestCorrectionTypes(request.RequestID);
    
    const allTransitions = await Request.findTransitionsByCurrentStatus(
        request.CategoryID,
        correctionTypesResult.map(t => t.CorrectionTypeID),
        nextStatusId
    );
    
    if (allTransitions.length === 0) {
        return [];
    }
    
    const nextStepSequence = allTransitions[0].StepSequence;
    const nextTransitions = allTransitions.filter(t => t.StepSequence === nextStepSequence);
    
    const nextRequiredRoleIds = [...new Set(nextTransitions.map(t => t.RequiredRoleID))];
    let approvers = [];
    const activeCorrectionTypeId = correctionTypesResult.length > 0 ? correctionTypesResult[0].CorrectionTypeID : null;
    
    const specialMappings = await Admin.getSpecialApproverMappings(request.CategoryID, activeCorrectionTypeId);
    const stepSpecificUserIds = specialMappings
        .filter(m => m.StepSequence === nextStepSequence)
        .map(m => m.UserID);

    if (stepSpecificUserIds.length > 0) {
        const userDetails = await Promise.all(stepSpecificUserIds.map(id => User.findById(id)));
        approvers = userDetails.filter(u => u && u.IsActive);
    } else {
        for (const roleId of nextRequiredRoleIds) {
            const transitionRule = nextTransitions.find(t => t.RequiredRoleID === roleId);
            if (!transitionRule) continue;
            
            const roleBasedUsers = await Permission.findUsersByRoleAndCategory(
                roleId,
                request.CategoryID,
                transitionRule.FilterByDepartment || false,
                request.RequesterDepartmentID
            );
            
            const fullUserInfos = await Promise.all(roleBasedUsers.map(u => User.findById(u.UserID)));
            approvers.push(...fullUserInfos.filter(Boolean));
        }
    }

    const uniqueApprovers = [...new Map(approvers.map(item => [item["UserID"], item])).values()];
    
    for (const approver of uniqueApprovers) {
        await Notification.create({
            userId: approver.UserID,
            message: `มีคำร้อง #${request.RequestNumber || request.RequestID} (${request.CategoryName}) รอการอนุมัติ`,
            requestId: request.RequestID
        });
    }

    return uniqueApprovers.map(u => ({
        fullName: u.FullName,
        email: u.Email
    }));
};

const notifyRequester = async (requesterId, requestId, message) => {
    await Notification.create({
        userId: requesterId,
        message: message,
        requestId: requestId
    });
};

module.exports = {
    notifyNextApprovers,
    notifyRequester,
    findNextApprovers
};