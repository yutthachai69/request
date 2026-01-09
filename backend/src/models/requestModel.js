// backend/src/models/requestModel.js
const { getPool, sql } = require('../config/db');
const fs = require('fs');
const path = require('path');
const { getCurrentBangkokTime } = require('../utils/dateHelper');
const AuditLog = require('../models/auditLogModel');
const ApprovalHistory = require('./approvalHistoryModel');

class Request {
    static async findTransitions(params) {
        const { categoryId, correctionTypeIds = [], currentStatusId, roleId = null } = params;
        const pool = getPool();
        const request = pool.request();

        request.input('CategoryID', sql.Int, categoryId);
        request.input('CurrentStatusID', sql.Int, currentStatusId);
        if (roleId) {
            request.input('RequiredRoleID', sql.Int, roleId);
        }

        let correctionTypeIdsInClause = 'NULL';
        if (correctionTypeIds.length > 0) {
            correctionTypeIdsInClause = correctionTypeIds.map((id, index) => `@corrTypeId${index}`).join(',');
            correctionTypeIds.forEach((id, index) => {
                request.input(`corrTypeId${index}`, sql.Int, id);
            });
        }
        
        const query = `
            WITH RankedSpecificRules AS (
                SELECT 
                    t.TransitionID, t.CategoryID, t.CorrectionTypeID, t.CurrentStatusID, 
                    t.ActionID, t.RequiredRoleID, t.NextStatusID, t.FilterByDepartment, t.StepSequence,
                    a.ActionName, a.DisplayName AS ActionDisplayName, 
                    ns.StatusName AS NextStatusName, ns.StatusCode AS NextStatusCode,
                    ROW_NUMBER() OVER(PARTITION BY t.ActionID ORDER BY ct.Priority ASC) as rn
                FROM WorkflowTransitions t
                JOIN CorrectionTypes ct ON t.CorrectionTypeID = ct.CorrectionTypeID
                JOIN Actions a ON t.ActionID = a.ActionID
                JOIN Statuses ns ON t.NextStatusID = ns.StatusID
                WHERE t.CategoryID = @CategoryID
                  AND t.CurrentStatusID = @CurrentStatusID
                  AND t.CorrectionTypeID IN (${correctionTypeIdsInClause})
                  ${roleId ? 'AND t.RequiredRoleID = @RequiredRoleID' : ''}
            ),
            FinalSpecificRules AS (
                SELECT * FROM RankedSpecificRules WHERE rn = 1
            ),
            GeneralRules AS (
                SELECT 
                    t.TransitionID, t.CategoryID, t.CorrectionTypeID, t.CurrentStatusID, 
                    t.ActionID, t.RequiredRoleID, t.NextStatusID, t.FilterByDepartment, t.StepSequence,
                    a.ActionName, a.DisplayName AS ActionDisplayName, 
                    ns.StatusName AS NextStatusName, ns.StatusCode AS NextStatusCode
                FROM WorkflowTransitions t
                JOIN Actions a ON t.ActionID = a.ActionID
                JOIN Statuses ns ON t.NextStatusID = ns.StatusID
                WHERE t.CategoryID = @CategoryID
                  AND t.CurrentStatusID = @CurrentStatusID
                  AND t.CorrectionTypeID IS NULL
                  ${roleId ? 'AND t.RequiredRoleID = @RequiredRoleID' : ''}
            )
            SELECT 
                TransitionID, CategoryID, CorrectionTypeID, CurrentStatusID, ActionID, 
                RequiredRoleID, NextStatusID, FilterByDepartment, StepSequence, ActionName, 
                ActionDisplayName, NextStatusName, NextStatusCode
            FROM FinalSpecificRules
            UNION ALL
            SELECT 
                TransitionID, CategoryID, CorrectionTypeID, CurrentStatusID, ActionID, 
                RequiredRoleID, NextStatusID, FilterByDepartment, StepSequence, ActionName, 
                ActionDisplayName, NextStatusName, NextStatusCode
            FROM GeneralRules
            WHERE NOT EXISTS (SELECT 1 FROM FinalSpecificRules);
        `;
        
        const result = await request.query(query);
        return result.recordset;
    }


    static async findPossibleTransitions(categoryId, correctionTypeIds, currentStatusId, roleId) {
        return this.findTransitions({ categoryId, correctionTypeIds, currentStatusId, roleId });
    }

    static async findTransitionsByCurrentStatus(categoryId, correctionTypeIds, currentStatusId) {
        return this.findTransitions({ categoryId, correctionTypeIds, currentStatusId });
    }

    static async create(requestData) {
        const { 
            requesterId, categoryId, locationId, requestDate, 
            problemDetail, attachmentPath,
            reasonId, correctionTypeIds,
            problemSystem, problemReason
        } = requestData;

        const pool = getPool();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            const initialStatusResult = await new sql.Request(transaction)
                .query("SELECT StatusID FROM Statuses WHERE IsInitialState = 1");

            if (initialStatusResult.recordset.length === 0) {
                throw new Error('สถานะเริ่มต้นยังไม่ได้ถูกตั้งค่าในระบบ');
            }
            const initialStatusId = initialStatusResult.recordset[0].StatusID;

            const request = new sql.Request(transaction);
            const result = await request
                .input('RequesterID', sql.Int, requesterId)
                .input('CategoryID', sql.Int, categoryId)
                .input('LocationID', sql.Int, locationId)
                .input('RequestDate', sql.Date, requestDate)
                .input('ProblemDetail', sql.NVarChar, problemDetail)
                .input('AttachmentPath', sql.NVarChar(sql.MAX), attachmentPath)
                .input('CurrentStatusID', sql.Int, initialStatusId)
                .input('ReasonID', sql.Int, reasonId)
                .input('ProblemSystem', sql.NVarChar, problemSystem)
                .input('ProblemReason', sql.NVarChar, problemReason)
                .query(`
                    INSERT INTO Requests (
                        RequesterID, CategoryID, LocationID, RequestDate, 
                        ProblemDetail, AttachmentPath, CurrentStatusID, ReasonID,
                        ProblemSystem, ProblemReason
                    )
                    OUTPUT Inserted.*
                    VALUES (
                        @RequesterID, @CategoryID, @LocationID, @RequestDate, 
                        @ProblemDetail, @AttachmentPath, @CurrentStatusID, @ReasonID,
                        @ProblemSystem, @ProblemReason
                    )
                `);
            
            const newRequest = result.recordset[0];
            const newRequestId = newRequest.RequestID;

            if (correctionTypeIds && correctionTypeIds.length > 0) {
                for (const typeId of correctionTypeIds) {
                    const typeRequest = new sql.Request(transaction);
                    await typeRequest
                        .input('RequestID', sql.Int, newRequestId)
                        .input('CorrectionTypeID', sql.Int, typeId)
                        .query('INSERT INTO RequestCorrectionTypes (RequestID, CorrectionTypeID) VALUES (@RequestID, @CorrectionTypeID)');
                }
            }

            await transaction.commit();
            return newRequest;

        } catch (err) {
            await transaction.rollback();
            console.error("SQL Error in Request.create:", err);
            throw err;
        }
    }

    static async getRequestsByRole({ userRoleId, userId, status, search, categoryId, approvedByMe, isExport = false, startDate, endDate, page = 1, limit = 10, userDepartmentId }) {
        if (approvedByMe) {
            return this.getHistoryByApprover(userId, categoryId, search, page, limit);
        }

        const pool = getPool();
        const request = pool.request();

        let fromAndJoins = `
            FROM Requests r
            JOIN Users u ON r.RequesterID = u.UserID
            LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
            JOIN Categories c ON r.CategoryID = c.CategoryID
            LEFT JOIN Locations l ON r.LocationID = l.LocationID
            JOIN Statuses s ON r.CurrentStatusID = s.StatusID
            -- START: เพิ่มส่วนนี้เพื่อดึงความเห็นล่าสุด
            OUTER APPLY (
                SELECT TOP 1 ah.Comment, u_ah.FullName as CommentBy
                FROM ApprovalHistory ah
                JOIN Users u_ah ON ah.ApproverID = u_ah.UserID
                WHERE ah.RequestID = r.RequestID AND ah.Comment IS NOT NULL
                ORDER BY ah.ApprovalTimestamp DESC
            ) AS LatestHistory
            -- END: เพิ่มส่วนนี้
        `;

        const whereConditions = [];
        request.input('userId', sql.Int, userId);
        request.input('userRoleId', sql.Int, userRoleId);
        
        if (categoryId) { 
            request.input('categoryId', sql.Int, categoryId);
            whereConditions.push(`r.CategoryID = @categoryId`);
        }

        const userRoleResult = await pool.request().input('roleId', sql.Int, userRoleId).query('SELECT ViewScope FROM Roles WHERE RoleID = @roleId');
        const viewScope = userRoleResult.recordset[0]?.ViewScope || 'NONE'; 
        
        if (viewScope === 'OWN') {
            whereConditions.push(`r.RequesterID = @userId`);
        } else if (viewScope === 'ASSIGNED') {
            const hasDeptFiltering = await pool.request()
                .input('roleId', sql.Int, userRoleId)
                .input('categoryId', sql.Int, categoryId)
                .query(`
                    SELECT COUNT(*) as count 
                    FROM WorkflowTransitions 
                    WHERE RequiredRoleID = @roleId AND FilterByDepartment = 1 AND CategoryID = @categoryId
                `);
                
            if (hasDeptFiltering.recordset[0]?.count > 0 && userDepartmentId !== null) {
                whereConditions.push(`d.DepartmentID = @userDepartmentId OR d.DepartmentID IS NULL`);
                request.input('userDepartmentId', sql.Int, userDepartmentId);
            }
        
            whereConditions.push(`
                (
                    r.CategoryID IN (SELECT CategoryID FROM UserCategoryPermissions WHERE UserID = @userId)
                    OR EXISTS (
                        SELECT 1 
                        FROM WorkflowTransitions wt
                        WHERE (wt.CategoryID = r.CategoryID)
                            AND (wt.CorrectionTypeID IS NULL OR wt.CorrectionTypeID IN (SELECT CorrectionTypeID FROM RequestCorrectionTypes rct WHERE rct.RequestID = r.RequestID))
                            AND wt.CurrentStatusID = r.CurrentStatusID
                            AND wt.RequiredRoleID = @userRoleId
                    )
                    OR EXISTS (
                        SELECT 1 
                        FROM UserSpecialRoles usr
                        JOIN WorkflowTransitions wt ON usr.RoleID = wt.RequiredRoleID
                        WHERE usr.UserID = @userId
                        AND (wt.CategoryID = r.CategoryID)
                        AND (wt.CorrectionTypeID IS NULL OR wt.CorrectionTypeID IN (SELECT CorrectionTypeID FROM RequestCorrectionTypes rct WHERE rct.RequestID = r.RequestID))
                        AND wt.CurrentStatusID = r.CurrentStatusID
                    )
                )
            `);
        } else if (viewScope === 'ALL') {
            // No additional filter needed for ALL scope
        } else {
            whereConditions.push(`1 = 0`);
        }
        
        if (status === 'pending') {
            whereConditions.push(`
                (
                    EXISTS (
                        SELECT 1 FROM WorkflowTransitions wt
                        WHERE (wt.CategoryID = r.CategoryID)
                          AND (wt.CorrectionTypeID IS NULL OR wt.CorrectionTypeID IN (SELECT CorrectionTypeID FROM RequestCorrectionTypes rct WHERE rct.RequestID = r.RequestID))
                          AND wt.CurrentStatusID = r.CurrentStatusID
                          AND wt.RequiredRoleID = @userRoleId
                    )
                    OR EXISTS (
                        SELECT 1 
                        FROM UserSpecialRoles usr
                        JOIN WorkflowTransitions wt ON usr.RoleID = wt.RequiredRoleID
                        WHERE usr.UserID = @userId
                        AND (wt.CategoryID = r.CategoryID)
                        AND (wt.CorrectionTypeID IS NULL OR wt.CorrectionTypeID IN (SELECT CorrectionTypeID FROM RequestCorrectionTypes rct WHERE rct.RequestID = r.RequestID))
                        AND wt.CurrentStatusID = r.CurrentStatusID
                    )
                )
            `);
        } else if (status && status !== 'all') {
            if (status.includes(',')) {
                const statusList = status.split(',').map(s => `'${s.trim()}'`).join(',');
                whereConditions.push(`s.StatusCode IN (${statusList})`);
            } else {
                whereConditions.push(`s.StatusCode = @status`);
                request.input('status', sql.NVarChar, status);
            }
        }
        
        if (search) { whereConditions.push(`(u.FullName LIKE @searchTerm OR r.RequestNumber LIKE @searchTerm OR CAST(r.RequestID AS NVARCHAR(20)) LIKE @searchTerm OR d.DepartmentName LIKE @searchTerm)`); request.input('searchTerm', sql.NVarChar, `%${search}%`); }

        const isCompletedTab = status === 'PROCESSED,COMPLETED';
        const dateFilterColumn = isCompletedTab ? 'CAST(r.IT_CompletedAt AS DATE)' : 'r.RequestDate';

        if (startDate) {
            whereConditions.push(`${dateFilterColumn} >= @startDate`);
            request.input('startDate', sql.Date, startDate);
        }
        if (endDate) {
            whereConditions.push(`${dateFilterColumn} <= @endDate`);
            request.input('endDate', sql.Date, endDate);
        }

        let whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(DISTINCT r.RequestID) as totalCount ${fromAndJoins} ${whereClause}`;
        const countResult = await request.query(countQuery);
        const totalCount = countResult.recordset[0].totalCount;

        let selectFields = `
            r.RequestID, r.RequestNumber, r.RequestDate, 
            s.StatusCode as CurrentStatus, s.StatusName,
            r.UpdatedAt, r.IT_CompletedAt,
            c.CategoryName,
            u.FullName as RequesterName,
            r.RequesterID,
            r.ProblemDetail,
            LatestHistory.Comment as LatestComment,
            LatestHistory.CommentBy as LatestCommentBy,
            CASE WHEN r.RequestNumber IS NULL THEN 0 ELSE 1 END as SortPriority
        `;

        if (isExport) {
            selectFields += `,
                d.DepartmentName as RequesterDepartment,
                l.LocationName,
                r.IT_OperatorName,
                (SELECT U_IT.FullName FROM ApprovalHistory AH_IT JOIN Users U_IT ON AH_IT.ApproverID = U_IT.UserID JOIN Roles RO ON U_IT.RoleID = RO.RoleID WHERE AH_IT.RequestID = r.RequestID AND RO.RoleName = 'IT Reviewer') AS ITCloserName,
                r.IT_CompletedAt,
                r.IT_Obstacles
            `;
        }
        
        const orderByClause = `ORDER BY SortPriority ASC, r.RequestNumber DESC, r.RequestID DESC`;
        const offset = (page - 1) * limit;
        const paginationClause = isExport ? '' : `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
        const dataQuery = `SELECT DISTINCT ${selectFields} ${fromAndJoins} ${whereClause} ${orderByClause} ${paginationClause}`;
        const dataResult = await request.query(dataQuery);

        return {
            requests: dataResult.recordset,
            totalCount: totalCount
        };
    }

    static async findById(id) {
        const pool = getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT
                    r.*,
                    u.FullName as RequesterFullName, 
                    u.DepartmentID as RequesterDepartmentID, 
                    d.DepartmentName as RequesterDepartment, 
                    u.Position as RequesterPosition, 
                    u.PhoneNumber, 
                    u.RoleID as RequesterRoleID,
                    c.CategoryName, c.RequiresCCSClosing,
                    l.LocationName,
                    s.StatusName, s.StatusCode,
                    cr.ReasonText
                FROM Requests r
                JOIN Users u ON r.RequesterID = u.UserID
                LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
                JOIN Categories c ON r.CategoryID = c.CategoryID
                LEFT JOIN Locations l ON r.LocationID = l.LocationID
                JOIN Statuses s ON r.CurrentStatusID = s.StatusID
                LEFT JOIN CorrectionReasons cr ON r.ReasonID = cr.ReasonID
                WHERE r.RequestID = @id
            `);
        
        return result.recordset[0] || null;
    }

    static async update(id, requestData) {
        const { correctionTypeIds, ...otherData } = requestData;
        
        const pool = getPool();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();
            const request = new sql.Request(transaction);
            request.input('id', sql.Int, id);

            const setClauses = [];
            for (const key in otherData) {
                if (otherData.hasOwnProperty(key) && otherData[key] !== undefined) {
                    let sqlType = sql.NVarChar;
                    if (key.endsWith('ID') || key.endsWith('Id')) {
                        sqlType = sql.Int;
                    } else if (key.endsWith('Date') || key.endsWith('At')) {
                        sqlType = sql.DateTime2;
                    } else if (key === 'AttachmentPath') {
                        sqlType = sql.NVarChar(sql.MAX);
                    }
                    setClauses.push(`${key} = @${key}`);
                    request.input(key, sqlType, otherData[key]);
                }
            }

            if (setClauses.length > 0) {
                setClauses.push('UpdatedAt = @updatedAt');
                request.input('updatedAt', sql.DateTime2, getCurrentBangkokTime());
                const query = `UPDATE Requests SET ${setClauses.join(', ')} WHERE RequestID = @id`;
                await request.query(query);
            }

            if (Array.isArray(correctionTypeIds)) {
                const deleteTypesReq = new sql.Request(transaction);
                await deleteTypesReq.input('RequestID', sql.Int, id)
                    .query('DELETE FROM RequestCorrectionTypes WHERE RequestID = @RequestID');

                if (correctionTypeIds.length > 0) {
                    for (const typeId of correctionTypeIds) {
                        const insertTypeReq = new sql.Request(transaction);
                        await insertTypeReq
                            .input('RequestID', sql.Int, id)
                            .input('CorrectionTypeID', sql.Int, typeId)
                            .query('INSERT INTO RequestCorrectionTypes (RequestID, CorrectionTypeID) VALUES (@RequestID, @CorrectionTypeID)');
                    }
                }
            }

            await transaction.commit();

        } catch (err) {
            await transaction.rollback();
            console.error("SQL Transaction Error in Request.update:", err);
            throw err;
        }
    }

    static async getHistoryByApprover(approverId, categoryId, search, page = 1, limit = 10) {
        const pool = getPool();
        const request = pool.request();
    
        let fromAndJoins = `
            FROM ApprovalHistory AS ah
            INNER JOIN Requests AS r ON ah.RequestID = r.RequestID
            INNER JOIN Users AS u ON r.RequesterID = u.UserID
            INNER JOIN Categories AS c ON r.CategoryID = c.CategoryID
            INNER JOIN Statuses s ON r.CurrentStatusID = s.StatusID
        `;
    
        const whereConditions = [`ah.ApproverID = @approverId`];
        request.input('approverId', sql.Int, approverId);
    
        if (categoryId) {
            whereConditions.push(`r.CategoryID = @categoryId`);
            request.input('categoryId', sql.Int, categoryId);
        }
    
        if (search) {
            whereConditions.push(`(u.FullName LIKE @searchTerm OR r.RequestNumber LIKE @searchTerm OR CAST(r.RequestID AS NVARCHAR(20)) LIKE @searchTerm)`);
            request.input('searchTerm', sql.NVarChar, `%${search}%`);
        }
        
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

        const countQuery = `SELECT COUNT(DISTINCT ah.ApprovalID) as totalCount ${fromAndJoins} ${whereClause}`;
        const countResult = await request.query(countQuery);
        const totalCount = countResult.recordset[0].totalCount;
        
        const selectFields = `
            r.RequestID, r.RequestNumber, r.RequestDate, r.ProblemDetail,
            s.StatusName, s.StatusCode as CurrentStatus, c.CategoryName, u.FullName as RequesterName,
            ah.ApprovalTimestamp, ah.ApprovalID,
            CASE WHEN r.RequestNumber IS NULL THEN 0 ELSE 1 END as SortPriority
        `;
    
        const orderByClause = `ORDER BY SortPriority ASC, r.RequestNumber DESC, r.RequestID DESC`;
        
        const offset = (page - 1) * limit;
        const paginationClause = `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    
        const dataQuery = `SELECT ${selectFields} ${fromAndJoins} ${whereClause} ${orderByClause} ${paginationClause}`;
        const result = await request.query(dataQuery);
        
        return {
            requests: result.recordset,
            totalCount: totalCount
        };
    }

    static async deleteById(id) {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();

            const request = new sql.Request(transaction);
            const result = await request.input('id_get', sql.Int, id).query('SELECT AttachmentPath FROM Requests WHERE RequestID = @id_get');
            const requestData = result.recordset[0];
            
            await new sql.Request(transaction).input('id_del_notif', sql.Int, id).query('DELETE FROM Notifications WHERE RequestID = @id_del_notif');
            await new sql.Request(transaction).input('id_del_link', sql.Int, id).query('DELETE FROM RequestCorrectionTypes WHERE RequestID = @id_del_link');
            await new sql.Request(transaction).input('id_del_hist', sql.Int, id).query('DELETE FROM ApprovalHistory WHERE RequestID = @id_del_hist');
            
            await new sql.Request(transaction).input('id_del_email', sql.Int, id).query('DELETE FROM EmailLog WHERE RequestID = @id_del_email');
            
            await new sql.Request(transaction).input('id_del_req', sql.Int, id).query('DELETE FROM Requests WHERE RequestID = @id_del_req');

            await transaction.commit();

            if (requestData && requestData.AttachmentPath) {
                const attachments = JSON.parse(requestData.AttachmentPath);
                if (Array.isArray(attachments)) {
                    attachments.forEach(filePath => {
                        const fullPath = path.resolve(__dirname, '..', '..', filePath);
                        fs.unlink(fullPath, (err) => {
                            if (err) console.error(`Failed to delete file after DB commit: ${fullPath}`, err);
                            else console.log(`Deleted file successfully: ${fullPath}`);
                        });
                    });
                }
            }
            return { success: true };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    static async getRequestCorrectionTypes(requestId) {
        const pool = getPool();
        const result = await pool.request()
            .input('requestId', sql.Int, requestId)
            .query('SELECT rct.CorrectionTypeID, ct.Priority FROM RequestCorrectionTypes rct JOIN CorrectionTypes ct ON rct.CorrectionTypeID = ct.CorrectionTypeID WHERE rct.RequestID = @requestId ORDER BY ct.Priority ASC');
        return result.recordset;
    }

    static async getAverageApprovalTime() {
        const pool = getPool();
        // ใช้ RequestDate แทน CreatedAt เพราะ RequestDate เป็นวันที่ที่ผู้ใช้เลือกและไม่เปลี่ยน
        // และตรวจสอบให้แน่ใจว่า IT_CompletedAt มากกว่า RequestDate
        const result = await pool.request().query(`
            SELECT AVG(CAST(DATEDIFF(hour, RequestDate, IT_CompletedAt) AS FLOAT)) as avgHours
            FROM Requests
            WHERE IT_CompletedAt IS NOT NULL 
                AND RequestDate IS NOT NULL
                AND IT_CompletedAt >= RequestDate
        `);
        const avgHours = result.recordset[0]?.avgHours;
        // ถ้าไม่มีข้อมูลหรือค่าเป็นลบ ให้ return null
        if (!avgHours || avgHours < 0 || isNaN(avgHours)) {
            return null;
        }
        return parseFloat(avgHours.toFixed(1));
    }

    static async getRequestCountByCategory() {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT c.CategoryName, COUNT(r.RequestID) as requestCount
            FROM Requests r
            JOIN Categories c ON r.CategoryID = c.CategoryID
            GROUP BY c.CategoryName
            ORDER BY requestCount DESC
        `);
        return result.recordset;
    }

    static async getPendingRequestsCount() {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT COUNT(r.RequestID) as pendingCount
            FROM Requests r
            JOIN Statuses s ON r.CurrentStatusID = s.StatusID
            WHERE s.StatusCode NOT IN ('COMPLETED', 'REVISION_REQUIRED')
        `);
        return result.recordset[0]?.pendingCount || 0;
    }

    static async getStatsByPermittedCategories(userId) {
        const pool = getPool();
        const permittedCategories = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT c.CategoryID, c.CategoryName 
                FROM UserCategoryPermissions p
                JOIN Categories c ON p.CategoryID = c.CategoryID
                WHERE p.UserID = @userId
            `);

        const results = [];
        for (const category of permittedCategories.recordset) {
            const statusPromise = pool.request()
                .input('catId', sql.Int, category.CategoryID)
                .query(`
                    SELECT s.StatusName, COUNT(r.RequestID) as count
                    FROM Requests r
                    JOIN Statuses s ON r.CurrentStatusID = s.StatusID
                    WHERE r.CategoryID = @catId
                    GROUP BY s.StatusName
                `);
            
            const locationPromise = pool.request()
                .input('catId', sql.Int, category.CategoryID)
                .query(`
                    SELECT l.LocationName, COUNT(r.RequestID) as count
                    FROM Requests r
                    JOIN Locations l ON r.LocationID = l.LocationID
                    WHERE r.CategoryID = @catId
                    GROUP BY l.LocationName
                `);

            const [statusRes, locationRes] = await Promise.all([statusPromise, locationPromise]);

            if (statusRes.recordset.length > 0) {
                results.push({
                    categoryName: `${category.CategoryName} - Status`,
                    chartType: 'status',
                    data: statusRes.recordset
                });
            }

            if (locationRes.recordset.length > 0) {
                 results.push({
                    categoryName: `${category.CategoryName} - Location`,
                    chartType: 'location',
                    data: locationRes.recordset
                });
            }
        }
        return results;
    }

    static async getAggregatedReportData({ departmentId, startDate, endDate }) {
        const pool = getPool();
        const request = pool.request();

        let baseQuery = `
            FROM Requests r
            JOIN Statuses s ON r.CurrentStatusID = s.StatusID
            JOIN Categories c ON r.CategoryID = c.CategoryID
        `;
        const whereConditions = [];

        if (departmentId) {
            baseQuery += ' JOIN Users u ON r.RequesterID = u.UserID';
            whereConditions.push('u.DepartmentID = @deptId');
            request.input('deptId', sql.Int, departmentId);
        }

        if (startDate) {
            whereConditions.push('r.RequestDate >= @startDate');
            request.input('startDate', sql.Date, startDate);
        }
        if (endDate) {
            whereConditions.push('r.RequestDate < DATEADD(day, 1, @endDate)');
            request.input('endDate', sql.Date, endDate);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const summaryPromise = request.query(`
            SELECT 
                COUNT(*) as totalRequests,
                SUM(CASE WHEN s.StatusCode = 'COMPLETED' THEN 1 ELSE 0 END) as completedRequests,
                SUM(CASE WHEN s.StatusCode = 'REVISION_REQUIRED' THEN 1 ELSE 0 END) as rejectedRequests,
                AVG(CAST(DATEDIFF(hour, r.CreatedAt, r.IT_CompletedAt) AS FLOAT)) as avgCompletionHours
            ${baseQuery} ${whereClause}
        `);
        
        const byStatusPromise = request.query(`
            SELECT s.StatusName, COUNT(r.RequestID) as count
            ${baseQuery} ${whereClause}
            GROUP BY s.StatusName
            ORDER BY count DESC
        `);

        const byCategoryPromise = request.query(`
            SELECT c.CategoryName, COUNT(r.RequestID) as count
            ${baseQuery} ${whereClause}
            GROUP BY c.CategoryName
            ORDER BY count DESC
        `);

        const [summaryRes, byStatusRes, byCategoryRes] = await Promise.all([
            summaryPromise,
            byStatusPromise,
            byCategoryPromise
        ]);

        return {
            summary: summaryRes.recordset[0],
            byStatus: byStatusRes.recordset,
            byCategory: byCategoryRes.recordset
        };
    }
    
    static async checkParallelApprovalsCompleted(requestId, currentStatusId, currentStepSequence) {
        const pool = getPool();
        const request = pool.request()
            .input('requestId', sql.Int, requestId)
            .input('currentStatusId', sql.Int, currentStatusId)
            .input('currentStepSequence', sql.Int, currentStepSequence);

        const transitionsInStep = await request.query(`
            SELECT COUNT(*) AS totalTransitions
            FROM WorkflowTransitions wt
            WHERE wt.CategoryID = (SELECT CategoryID FROM Requests WHERE RequestID = @requestId)
              AND wt.CurrentStatusID = @currentStatusId
              AND wt.StepSequence = @currentStepSequence
        `);

        const approvalsInStep = await request.query(`
            SELECT COUNT(DISTINCT ApproverID) AS totalApprovals
            FROM ApprovalHistory ah
            WHERE ah.RequestID = @requestId
              AND ah.ApprovalLevel = @currentStepSequence
              AND ah.ActionType IN ('อนุมัติ', 'ดำเนินการ (IT)')
        `);

        const totalTransitions = transitionsInStep.recordset[0].totalTransitions;
        const totalApprovals = approvalsInStep.recordset[0].totalApprovals;

        return { allApproved: totalApprovals === totalTransitions, totalTransitions, totalApprovals };
    }
}

module.exports = Request;