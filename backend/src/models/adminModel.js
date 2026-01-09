// backend/src/models/adminModel.js
const { getPool, sql } = require('../config/db');
const { BadRequestError } = require('../utils/errors');

const getCategoryMappingsForCorrectionType = async (correctionTypeId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('CorrectionTypeID', sql.Int, correctionTypeId)
        .query('SELECT CategoryID FROM CategoryCorrectionTypeMappings WHERE CorrectionTypeID = @CorrectionTypeID');
    return result.recordset.map(row => row.CategoryID);
};


const updateCategoryMappingsForCorrectionType = async (correctionTypeId, categoryIds = [], transaction) => {
    const request = new sql.Request(transaction);

    await request.input('CorrectionTypeID_del', sql.Int, correctionTypeId)
        .query('DELETE FROM CategoryCorrectionTypeMappings WHERE CorrectionTypeID = @CorrectionTypeID_del');

    if (categoryIds.length > 0) {
        for (const categoryId of categoryIds) {
            const insertRequest = new sql.Request(transaction);
            await insertRequest
                .input('CategoryID_ins', sql.Int, categoryId)
                .input('CorrectionTypeID_ins', sql.Int, correctionTypeId)
                .query('INSERT INTO CategoryCorrectionTypeMappings (CategoryID, CorrectionTypeID) VALUES (@CategoryID_ins, @CorrectionTypeID_ins)');
        }
    }
};


const getWorkflow = async (categoryId, correctionTypeId) => {
    const pool = getPool();
    const request = pool.request()
        .input('CategoryID', sql.Int, categoryId);
    
    let query = `
        SELECT wt.*, s_curr.StatusName as CurrentStatusName, a.ActionName, a.DisplayName as ActionDisplayName, r.RoleName as RequiredRoleName, s_next.StatusName as NextStatusName 
        FROM WorkflowTransitions wt
        JOIN Statuses s_curr ON wt.CurrentStatusID = s_curr.StatusID
        JOIN Actions a ON wt.ActionID = a.ActionID
        JOIN Roles r ON wt.RequiredRoleID = r.RoleID
        JOIN Statuses s_next ON wt.NextStatusID = s_next.StatusID
        WHERE wt.CategoryID = @CategoryID
    `;

    if (correctionTypeId) {
        query += ' AND wt.CorrectionTypeID = @CorrectionTypeID';
        request.input('CorrectionTypeID', sql.Int, correctionTypeId);
    } else {
        query += ' AND wt.CorrectionTypeID IS NULL';
    }
    const result = await request.query(query);
    return result.recordset;
};

const getActions = async () => {
    const pool = getPool();
    const result = await pool.request().query('SELECT * FROM Actions ORDER BY ActionID');
    return result.recordset;
};

const getRoles = async () => {
    const pool = getPool();
    const result = await pool.request().query('SELECT * FROM Roles ORDER BY RoleID');
    return result.recordset;
};

const createRole = async (roleData) => {
    const { RoleName, Description, AllowBulkActions } = roleData;
    const pool = getPool();
    await pool.request()
        .input('RoleName', sql.NVarChar, RoleName)
        .input('Description', sql.NVarChar, Description)
        .input('AllowBulkActions', sql.Bit, AllowBulkActions)
        .query('INSERT INTO Roles (RoleName, Description, AllowBulkActions) VALUES (@RoleName, @Description, @AllowBulkActions)');
};

const updateRole = async (id, roleData) => {
    const { RoleName, Description, AllowBulkActions } = roleData;
    const pool = getPool();
    await pool.request()
        .input('id', sql.Int, id)
        .input('RoleName', sql.NVarChar, RoleName)
        .input('Description', sql.NVarChar, Description)
        .input('AllowBulkActions', sql.Bit, AllowBulkActions)
        .query('UPDATE Roles SET RoleName = @RoleName, Description = @Description, AllowBulkActions = @AllowBulkActions WHERE RoleID = @id');
};

const deleteRole = async (id) => {
    const pool = getPool();
    const request = pool.request().input('id', sql.Int, id);

    const essentialRoleIds = [1, 2]; 
    if (essentialRoleIds.includes(parseInt(id, 10))) {
        throw new BadRequestError('ไม่สามารถลบบทบาทพื้นฐานของระบบได้');
    }

    const userCheck = await request.query('SELECT TOP 1 UserID FROM Users WHERE RoleID = @id');
    if (userCheck.recordset.length > 0) {
        throw new BadRequestError('ไม่สามารถลบได้ เนื่องจากมีผู้ใช้งานถูกกำหนดบทบาทนี้อยู่');
    }

    const workflowCheck = await request.query('SELECT TOP 1 TransitionID FROM WorkflowTransitions WHERE RequiredRoleID = @id');
    if (workflowCheck.recordset.length > 0) {
        throw new BadRequestError('ไม่สามารถลบได้ เนื่องจากมี Workflow ผูกกับบทบาทนี้');
    }

    await request.query('DELETE FROM Roles WHERE RoleID = @id');
};


const getCorrectionTypesAdmin = async ({ page = 1, limit = 10 }) => {
    const pool = getPool();
    const request = pool.request();
    
    const countQuery = `SELECT COUNT(*) as totalCount FROM CorrectionTypes`;
    const countResult = await request.query(countQuery);
    const totalCount = countResult.recordset[0].totalCount;
    
    const startRow = (page - 1) * limit + 1;
    const endRow = page * limit;

    const dataQuery = `
        WITH PagedResults AS (
            SELECT 
                ct.*,
                STUFF(
                    (
                        SELECT ', ' + c.CategoryName
                        FROM CategoryCorrectionTypeMappings ccm
                        JOIN Categories c ON ccm.CategoryID = c.CategoryID
                        WHERE ccm.CorrectionTypeID = ct.CorrectionTypeID
                        FOR XML PATH('')
                    ), 1, 2, ''
                ) as UsedInCategories,
                ROW_NUMBER() OVER (ORDER BY ct.Priority, ct.CorrectionTypeName) as RowNum
            FROM CorrectionTypes ct
        )
        SELECT * FROM PagedResults
        WHERE RowNum BETWEEN @startRow AND @endRow;
    `;
    
    request.input('startRow', sql.Int, startRow);
    request.input('endRow', sql.Int, endRow);
    const dataResult = await request.query(dataQuery);

    return {
        types: dataResult.recordset,
        totalCount: totalCount
    };
};


const createCorrectionType = async (data) => {
    const { name, fieldsConfig, templateString, priority, requiredRoleLevel, categoryIds } = data;
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();

        const result = await new sql.Request(transaction)
            .input('name', sql.NVarChar, name)
            .input('fieldsConfig', sql.NVarChar(sql.MAX), fieldsConfig)
            .input('templateString', sql.NVarChar(sql.MAX), templateString)
            .input('priority', sql.Int, priority)
            .input('requiredRoleLevel', sql.Decimal(4,2), requiredRoleLevel)
            .query(`
                INSERT INTO CorrectionTypes (CorrectionTypeName, FieldsConfig, TemplateString, Priority, RequiredRoleLevel) 
                OUTPUT Inserted.CorrectionTypeID
                VALUES (@name, @fieldsConfig, @templateString, @priority, @requiredRoleLevel);
            `);

        const newTypeId = result.recordset[0].CorrectionTypeID;
        
        if (categoryIds) {
            await updateCategoryMappingsForCorrectionType(newTypeId, categoryIds, transaction);
        }

        await transaction.commit();
        return { CorrectionTypeID: newTypeId };

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

const updateCorrectionType = async (id, data) => {
    const { name, fieldsConfig, templateString, priority, isActive, requiredRoleLevel, categoryIds } = data;
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();

        await new sql.Request(transaction)
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('fieldsConfig', sql.NVarChar(sql.MAX), fieldsConfig)
            .input('templateString', sql.NVarChar(sql.MAX), templateString)
            .input('priority', sql.Int, priority)
            .input('isActive', sql.Bit, isActive)
            .input('requiredRoleLevel', sql.Decimal(4,2), requiredRoleLevel)
            .query(`
                UPDATE CorrectionTypes 
                SET CorrectionTypeName = @name, FieldsConfig = @fieldsConfig, TemplateString = @templateString, 
                    Priority = @priority, IsActive = @isActive, RequiredRoleLevel = @requiredRoleLevel 
                WHERE CorrectionTypeID = @id
            `);

        if (typeof categoryIds !== 'undefined') {
            await updateCategoryMappingsForCorrectionType(id, categoryIds, transaction);
        }

        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

const deleteCorrectionType = async (id) => {
    const pool = getPool();
    const request = pool.request().input('id', sql.Int, id);

    const requestCheck = await request.query('SELECT TOP 1 RequestID FROM RequestCorrectionTypes WHERE CorrectionTypeID = @id');
    if (requestCheck.recordset.length > 0) {
        throw new BadRequestError('ไม่สามารถลบได้ เนื่องจากประเภทการแก้ไขนี้ถูกใช้งานในคำร้องแล้ว');
    }

    const workflowCheck = await request.query('SELECT TOP 1 TransitionID FROM WorkflowTransitions WHERE CorrectionTypeID = @id');
    if (workflowCheck.recordset.length > 0) {
        throw new BadRequestError('ไม่สามารถลบได้ เนื่องจากมี Workflow ผูกกับประเภทการแก้ไขนี้');
    }
    
    await request.query('DELETE FROM CorrectionTypes WHERE CorrectionTypeID = @id');
};


const getCorrectionReasons = async () => {
    const pool = getPool();
    const result = await pool.request().query('SELECT * FROM CorrectionReasons ORDER BY ReasonID');
    return result.recordset;
};

const createCorrectionReason = async (reasonText) => {
    const pool = getPool();
    await pool.request().input('reasonText', sql.NVarChar, reasonText).query('INSERT INTO CorrectionReasons (ReasonText) VALUES (@reasonText)');
};

const updateCorrectionReason = async (id, reasonText, isActive) => {
    const pool = getPool();
    await pool.request().input('id', sql.Int, id).input('reasonText', sql.NVarChar, reasonText).input('isActive', sql.Bit, isActive).query('UPDATE CorrectionReasons SET ReasonText = @reasonText, IsActive = @isActive WHERE ReasonID = @id');
};

const getSpecialRoles = async () => {
    const pool = getPool();
    const result = await pool.request().query('SELECT * FROM SpecialRoles ORDER BY RoleName');
    return result.recordset;
};

const getSpecialRolesForUser = async (userId) => {
    const pool = getPool();
    const result = await pool.request().input('userId', sql.Int, userId).query('SELECT RoleID FROM UserSpecialRoles WHERE UserID = @userId');
    return result.recordset.map(row => row.RoleID);
};

const updateSpecialRolesForUser = async (userId, roleIds = []) => {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        await new sql.Request(transaction).input('userId', sql.Int, userId).query('DELETE FROM UserSpecialRoles WHERE UserID = @userId');
        for (const roleId of roleIds) {
            await new sql.Request(transaction).input('userId', sql.Int, userId).input('roleId', sql.Int, roleId).query('INSERT INTO UserSpecialRoles (UserID, RoleID) VALUES (@userId, @roleId)');
        }
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

const getAllWorkflows = async () => {
    const pool = getPool();
    const result = await pool.request().query(`SELECT t.TransitionID, t.CategoryID, c.CategoryName, t.CorrectionTypeID, ct.CorrectionTypeName, t.CurrentStatusID, cs.StatusName as CurrentStatusName, t.ActionID, a.DisplayName as ActionDisplayName, a.ActionName, t.RequiredRoleID, r.RoleName as RequiredRoleName, t.NextStatusID, ns.StatusName as NextStatusName, t.FilterByDepartment FROM WorkflowTransitions t LEFT JOIN Categories c ON t.CategoryID = c.CategoryID LEFT JOIN CorrectionTypes ct ON t.CorrectionTypeID = ct.CorrectionTypeID JOIN Statuses cs ON t.CurrentStatusID = cs.StatusID JOIN Actions a ON t.ActionID = a.ActionID JOIN Roles r ON t.RequiredRoleID = r.RoleID JOIN Statuses ns ON t.NextStatusID = ns.StatusID ORDER BY c.CategoryName, ct.CorrectionTypeName, t.CurrentStatusID, t.ActionID`);
    return result.recordset;
};

const updateWorkflow = async (categoryId, correctionTypeId, transitions) => {
    // ✅ ตรวจสอบว่า transitions มีข้อมูลหรือไม่
    if (!transitions || !Array.isArray(transitions) || transitions.length === 0) {
        throw new BadRequestError('ไม่สามารถอัปเดต Workflow ได้ เนื่องจากไม่มีขั้นตอนการอนุมัติ กรุณาเพิ่มขั้นตอนอย่างน้อย 1 ขั้นตอน');
    }

    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        
        // ✅ ตรวจสอบว่ามี Requests ที่ใช้ workflow นี้อยู่หรือไม่ก่อนอัปเดต
        const checkRequest = new sql.Request(transaction);
        checkRequest.input('CategoryID', sql.Int, categoryId);
        
        let checkQuery = `
            SELECT COUNT(*) as RequestCount 
            FROM Requests r
            WHERE r.CategoryID = @CategoryID
        `;
        
        if (correctionTypeId) {
            checkQuery += `
                AND EXISTS (
                    SELECT 1 
                    FROM RequestCorrectionTypes rct
                    WHERE rct.RequestID = r.RequestID 
                    AND rct.CorrectionTypeID = @CorrectionTypeID
                )
            `;
            checkRequest.input('CorrectionTypeID', sql.Int, correctionTypeId);
        } else {
            checkQuery += `
                AND NOT EXISTS (
                    SELECT 1 
                    FROM RequestCorrectionTypes rct
                    WHERE rct.RequestID = r.RequestID
                )
            `;
        }
        
        // ✅ หมายเหตุ: อนุญาตให้อัปเดต workflow ได้แม้จะมี Requests ใช้งานอยู่
        // เพราะ workflow เก่าจะถูกลบและสร้างใหม่ ซึ่งอาจส่งผลกระทบต่อ Requests ที่กำลังดำเนินการอยู่
        // แต่เพื่อความยืดหยุ่นในการจัดการระบบ จึงอนุญาตให้อัปเดตได้
        // Admin ควรระวังเมื่ออัปเดต workflow ที่มี Requests ใช้งานอยู่
        
        const deleteRequest = new sql.Request(transaction);
        let deleteQuery;
        if (correctionTypeId) {
            deleteQuery = `DELETE FROM WorkflowTransitions WHERE CategoryID = @CategoryID AND CorrectionTypeID = @CorrectionTypeID`;
            deleteRequest.input('CategoryID', sql.Int, categoryId);
            deleteRequest.input('CorrectionTypeID', sql.Int, correctionTypeId);
        } else {
            deleteQuery = `DELETE FROM WorkflowTransitions WHERE CategoryID = @CategoryID AND CorrectionTypeID IS NULL`;
            deleteRequest.input('CategoryID', sql.Int, categoryId);
        }
        await deleteRequest.query(deleteQuery);

        for (const tran of transitions) {
            const insertRequest = new sql.Request(transaction)
                .input('CategoryID', sql.Int, categoryId)
                .input('CorrectionTypeID', sql.Int, correctionTypeId || null)
                .input('CurrentStatusID', sql.Int, tran.CurrentStatusID)
                .input('ActionID', sql.Int, tran.ActionID)
                .input('RequiredRoleID', sql.Int, tran.RequiredRoleID)
                .input('NextStatusID', sql.Int, tran.NextStatusID)
                .input('FilterByDepartment', sql.Bit, tran.FilterByDepartment)
                .input('StepSequence', sql.Int, tran.StepSequence);
            await insertRequest.query(
                `INSERT INTO WorkflowTransitions (CategoryID, CorrectionTypeID, CurrentStatusID, ActionID, RequiredRoleID, NextStatusID, FilterByDepartment, StepSequence) 
                 VALUES (@CategoryID, @CorrectionTypeID, @CurrentStatusID, @ActionID, @RequiredRoleID, @NextStatusID, @FilterByDepartment, @StepSequence)`
            );
        }

        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        console.error("Error updating workflow:", err);
        throw err;
    }
};

const copyWorkflow = async (data) => {
    const { sourceCategoryId, sourceCorrectionTypeId, targetCategoryId, targetCorrectionTypeId } = data;
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();

        const request = new sql.Request(transaction);
        let sourceQuery = 'SELECT * FROM WorkflowTransitions WHERE CategoryID = @sourceCatId';
        request.input('sourceCatId', sql.Int, sourceCategoryId);
        if (sourceCorrectionTypeId) {
            sourceQuery += ' AND CorrectionTypeID = @sourceCorrTypeId';
            request.input('sourceCorrTypeId', sql.Int, sourceCorrectionTypeId);
        } else {
            sourceQuery += ' AND CorrectionTypeID IS NULL';
        }
        const result = await request.query(sourceQuery);
        const sourceTransitions = result.recordset;

        if (sourceTransitions.length > 0) {
            const deleteRequest = new sql.Request(transaction);
            let deleteQuery = 'DELETE FROM WorkflowTransitions WHERE CategoryID = @targetCatId';
            deleteRequest.input('targetCatId', sql.Int, targetCategoryId);
            if (targetCorrectionTypeId) {
                deleteQuery += ' AND CorrectionTypeID = @targetCorrTypeId';
                deleteRequest.input('targetCorrTypeId', sql.Int, targetCorrectionTypeId);
            } else {
                deleteQuery += ' AND CorrectionTypeID IS NULL';
            }
            await deleteRequest.query(deleteQuery);

            for (const tran of sourceTransitions) {
                const insertRequest = new sql.Request(transaction)
                    .input('CategoryID', sql.Int, targetCategoryId)
                    .input('CorrectionTypeID', sql.Int, targetCorrectionTypeId || null)
                    .input('CurrentStatusID', sql.Int, tran.CurrentStatusID)
                    .input('ActionID', sql.Int, tran.ActionID)
                    .input('RequiredRoleID', sql.Int, tran.RequiredRoleID)
                    .input('NextStatusID', sql.Int, tran.NextStatusID)
                    .input('FilterByDepartment', sql.Bit, tran.FilterByDepartment)
                    .input('StepSequence', sql.Int, tran.StepSequence);
                await insertRequest.query(`INSERT INTO WorkflowTransitions (CategoryID, CorrectionTypeID, CurrentStatusID, ActionID, RequiredRoleID, NextStatusID, FilterByDepartment, StepSequence) VALUES (@CategoryID, @CorrectionTypeID, @CurrentStatusID, @ActionID, @RequiredRoleID, @NextStatusID, @FilterByDepartment, @StepSequence)`);
            }
        }
        
        const specialRequest = new sql.Request(transaction);
        let sourceSpecialQuery = 'SELECT * FROM SpecialApproverMappings WHERE CategoryID = @sourceCatId';
        specialRequest.input('sourceCatId', sql.Int, sourceCategoryId);
        if (sourceCorrectionTypeId) {
            sourceSpecialQuery += ' AND CorrectionTypeID = @sourceCorrTypeId';
            specialRequest.input('sourceCorrTypeId', sql.Int, sourceCorrectionTypeId);
        } else {
            sourceSpecialQuery += ' AND CorrectionTypeID IS NULL';
        }
        const specialResult = await specialRequest.query(sourceSpecialQuery);
        const sourceSpecialMappings = specialResult.recordset;

        const deleteSpecialRequest = new sql.Request(transaction);
        let deleteSpecialQuery = 'DELETE FROM SpecialApproverMappings WHERE CategoryID = @targetCatId';
        deleteSpecialRequest.input('targetCatId', sql.Int, targetCategoryId);
        if (targetCorrectionTypeId) {
            deleteSpecialQuery += ' AND CorrectionTypeID = @targetCorrTypeId';
            deleteSpecialRequest.input('targetCorrTypeId', sql.Int, targetCorrectionTypeId);
        } else {
            deleteSpecialQuery += ' AND CorrectionTypeID IS NULL';
        }
        await deleteSpecialRequest.query(deleteSpecialQuery);

        if (sourceSpecialMappings.length > 0) {
            for (const mapping of sourceSpecialMappings) {
                const insertSpecialRequest = new sql.Request(transaction)
                    .input('CategoryID', sql.Int, targetCategoryId)
                    .input('CorrectionTypeID', sql.Int, targetCorrectionTypeId || null)
                    .input('StepSequence', sql.Int, mapping.StepSequence)
                    .input('UserID', sql.Int, mapping.UserID);
                await insertSpecialRequest.query(`INSERT INTO SpecialApproverMappings (CategoryID, CorrectionTypeID, StepSequence, UserID) VALUES (@CategoryID, @CorrectionTypeID, @StepSequence, @UserID)`);
            }
        }

        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

const deleteWorkflow = async (categoryId, correctionTypeId) => {
    const pool = getPool();
    const request = pool.request()
        .input('CategoryID', sql.Int, categoryId);

    // ✅ ตรวจสอบว่ามี Requests ที่ใช้ workflow นี้อยู่หรือไม่ก่อนลบ
    let checkRequestQuery = `
        SELECT COUNT(*) as RequestCount 
        FROM Requests r
        WHERE r.CategoryID = @CategoryID
    `;

    if (correctionTypeId) {
        checkRequestQuery += `
            AND EXISTS (
                SELECT 1 
                FROM RequestCorrectionTypes rct
                WHERE rct.RequestID = r.RequestID 
                AND rct.CorrectionTypeID = @CorrectionTypeID
            )
        `;
        request.input('CorrectionTypeID', sql.Int, correctionTypeId);
    } else {
        checkRequestQuery += `
            AND NOT EXISTS (
                SELECT 1 
                FROM RequestCorrectionTypes rct
                WHERE rct.RequestID = r.RequestID
            )
        `;
    }

    const checkResult = await request.query(checkRequestQuery);
    const requestCount = checkResult.recordset[0].RequestCount;

    if (requestCount > 0) {
        throw new BadRequestError(
            `ไม่สามารถลบ Workflow ได้ เนื่องจากมีคำร้องที่ใช้งาน Workflow นี้อยู่ ${requestCount} รายการ ` +
            `กรุณารอให้คำร้องเหล่านั้นดำเนินการเสร็จสิ้นก่อน หรือใช้ฟังก์ชัน "คัดลอก Workflow" เพื่อสร้าง Workflow ใหม่`
        );
    }

    // ✅ ถ้าไม่มี Requests ที่เกี่ยวข้องจึงลบได้
    let deleteQuery = 'DELETE FROM WorkflowTransitions WHERE CategoryID = @CategoryID';

    if (correctionTypeId) {
        deleteQuery += ' AND CorrectionTypeID = @CorrectionTypeID';
    } else {
        deleteQuery += ' AND CorrectionTypeID IS NULL';
    }
    
    await request.query(deleteQuery);
};

const getTabsForRole = async (roleId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('RoleID', sql.Int, roleId)
        .query(`
            SELECT t.Label, t.StatusFilter, t.IsHistory
            FROM RoleTabs rt
            JOIN Tabs t ON rt.TabID = t.TabID
            WHERE rt.RoleID = @RoleID
            ORDER BY t.DisplayOrder ASC
        `);
    return result.recordset;
};

const getSpecialApproverMappings = async (categoryId, correctionTypeId) => {
    const pool = getPool();
    const request = pool.request()
        .input('CategoryID', sql.Int, categoryId);
    
    let query = `SELECT StepSequence, UserID FROM SpecialApproverMappings WHERE CategoryID = @CategoryID`;
    
    if (correctionTypeId) {
        query += ' AND CorrectionTypeID = @CorrectionTypeID';
        request.input('CorrectionTypeID', sql.Int, correctionTypeId);
    } else {
        query += ' AND CorrectionTypeID IS NULL';
    }
    
    const result = await request.query(query);
    return result.recordset;
};

const updateSpecialApproverMappings = async (categoryId, correctionTypeId, mappings) => {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const deleteRequest = new sql.Request(transaction)
            .input('CategoryID', sql.Int, categoryId);

        let deleteQuery = 'DELETE FROM SpecialApproverMappings WHERE CategoryID = @CategoryID';
        if (correctionTypeId) {
            deleteQuery += ' AND CorrectionTypeID = @CorrectionTypeID';
            deleteRequest.input('CorrectionTypeID', sql.Int, correctionTypeId);
        } else {
            deleteQuery += ' AND CorrectionTypeID IS NULL';
        }
        await deleteRequest.query(deleteQuery);

        for (const mapping of mappings) {
            for (const userId of mapping.userIds) {
                 const insertRequest = new sql.Request(transaction)
                    .input('CategoryID', sql.Int, categoryId)
                    .input('CorrectionTypeID', sql.Int, correctionTypeId || null)
                    .input('StepSequence', sql.Int, mapping.step)
                    .input('UserID', sql.Int, userId);
                await insertRequest.query(
                    `INSERT INTO SpecialApproverMappings (CategoryID, CorrectionTypeID, StepSequence, UserID) VALUES (@CategoryID, @CorrectionTypeID, @StepSequence, @UserID)`
                );
            }
        }
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

const getOperationAuditReport = async ({ departmentId, startDate, endDate, search }) => {
    const pool = getPool();
    const request = pool.request();
    
    let query = `
        SELECT
            r.RequestID,
            r.RequestNumber,
            r.RequestDate,
            ah.ApprovalTimestamp,
            ah.ActionType,
            ah.Comment,
            u_act.FullName AS ActionByName,
            ISNULL(d.DepartmentName, 'ไม่ระบุ') AS DepartmentName,
            u_req.FullName AS RequesterName,
            ISNULL(s.StatusName, 'ไม่ระบุ') AS StatusName,
            ISNULL(s.ColorCode, '#9e9e9e') AS StatusColorCode,
            ISNULL(l.LocationName, 'ไม่ระบุ') AS LocationName,
            ISNULL(r.ProblemDetail, '') AS ProblemDetail,
            ISNULL(
                STUFF(
                    (
                        SELECT ', ' + ct.CorrectionTypeName
                        FROM RequestCorrectionTypes rct
                        INNER JOIN CorrectionTypes ct ON rct.CorrectionTypeID = ct.CorrectionTypeID
                        WHERE rct.RequestID = r.RequestID
                        ORDER BY ct.Priority ASC
                        FOR XML PATH('')
                    ), 1, 2, ''
                ), 'ไม่ระบุ'
            ) AS CorrectionTypeNames
        FROM ApprovalHistory ah
        INNER JOIN Requests r ON ah.RequestID = r.RequestID
        LEFT JOIN Users u_act ON ah.ApproverID = u_act.UserID
        LEFT JOIN Users u_req ON r.RequesterID = u_req.UserID
        LEFT JOIN Departments d ON u_req.DepartmentID = d.DepartmentID
        LEFT JOIN Statuses s ON r.CurrentStatusID = s.StatusID
        LEFT JOIN Locations l ON r.LocationID = l.LocationID
        WHERE 1=1
    `;
    
    if (departmentId) {
        query += ' AND u_req.DepartmentID = @departmentId';
        request.input('departmentId', sql.Int, departmentId);
    }
    
    if (startDate) {
        query += ' AND CAST(ah.ApprovalTimestamp AS DATE) >= @startDate';
        request.input('startDate', sql.Date, startDate);
    }
    
    if (endDate) {
        query += ' AND CAST(ah.ApprovalTimestamp AS DATE) <= @endDate';
        request.input('endDate', sql.Date, endDate);
    }
    
    if (search) {
        query += ' AND (r.RequestNumber LIKE @search OR u_req.FullName LIKE @search OR u_act.FullName LIKE @search)';
        request.input('search', sql.NVarChar, `%${search}%`);
    }
    
    query += ' ORDER BY ah.ApprovalTimestamp DESC';
    
    const result = await request.query(query);
    return result.recordset;
};

module.exports = {
    getActions,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    getCorrectionTypesAdmin,
    createCorrectionType,
    updateCorrectionType,
    deleteCorrectionType,
    getCorrectionReasons,
    createCorrectionReason,
    updateCorrectionReason,
    getSpecialRoles,
    getSpecialRolesForUser,
    updateSpecialRolesForUser,
    getAllWorkflows,
    getWorkflow, 
    updateWorkflow,
    copyWorkflow,
    deleteWorkflow,
    getTabsForRole,
    getSpecialApproverMappings,
    updateSpecialApproverMappings,
    getCategoryMappingsForCorrectionType,
    getOperationAuditReport,
};