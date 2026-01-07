// backend/src/models/masterDataModel.js
const { getPool, sql } = require('../config/db');
const { BadRequestError } = require('../utils/errors');

const getCategoryMappingsForLocation = async (locationId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('LocationID', sql.Int, locationId)
        .query('SELECT CategoryID FROM CategoryLocationMappings WHERE LocationID = @LocationID');
    return result.recordset.map(row => row.CategoryID);
};

const updateCategoryMappingsForLocation = async (locationId, categoryIds = [], transaction) => {
    const request = new sql.Request(transaction);
    await request.input('LocationID_del', sql.Int, locationId)
        .query('DELETE FROM CategoryLocationMappings WHERE LocationID = @LocationID_del');

    if (categoryIds.length > 0) {
        for (const categoryId of categoryIds) {
            const insertRequest = new sql.Request(transaction);
            await insertRequest
                .input('CategoryID_ins', sql.Int, categoryId)
                .input('LocationID_ins', sql.Int, locationId)
                .query('INSERT INTO CategoryLocationMappings (CategoryID, LocationID) VALUES (@CategoryID_ins, @LocationID_ins)');
        }
    }
};

class MasterData {
    static async getCategories() {
        const pool = getPool();
        const result = await pool.request().query('SELECT * FROM Categories ORDER BY CategoryName');
        return result.recordset;
    }

    static async getLocations(categoryId = null) {
        const pool = getPool();
        const request = pool.request();
        let query = 'SELECT * FROM Locations';

        if (categoryId) {
            query = `
                SELECT l.* FROM Locations l
                JOIN CategoryLocationMappings clm ON l.LocationID = clm.LocationID
                WHERE clm.CategoryID = @CategoryID
            `;
            request.input('CategoryID', sql.Int, categoryId);
        }
        
        query += ' ORDER BY LocationID';
        const result = await request.query(query);
        return result.recordset;
    }

    static async getStatuses() {
        const pool = getPool();
        const result = await pool.request().query('SELECT * FROM Statuses ORDER BY StatusID');
        return result.recordset;
    }

    static async getPermittedCategories(userId) {
        const pool = getPool();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT c.CategoryID, c.CategoryName
                FROM Categories c
                JOIN UserCategoryPermissions ucp ON c.CategoryID = ucp.CategoryID
                WHERE ucp.UserID = @userId
                ORDER BY c.CategoryName
            `);
        return result.recordset;
    }

    // --- Category CRUD ---
    static async createCategory(name, requiresCCSClosing = false) {
        const pool = getPool();
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('requiresCCSClosing', sql.Bit, requiresCCSClosing)
            .query('INSERT INTO Categories (CategoryName, RequiresCCSClosing) VALUES (@name, @requiresCCSClosing)');
    }

    static async updateCategory(id, name, requiresCCSClosing) {
        const pool = getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('requiresCCSClosing', sql.Bit, requiresCCSClosing)
            .query('UPDATE Categories SET CategoryName = @name, RequiresCCSClosing = @requiresCCSClosing WHERE CategoryID = @id');
    }

    static async deleteCategory(id) {
        const pool = getPool();
        const request = pool.request().input('id', sql.Int, id);
    
        const requestCheck = await request.query('SELECT TOP 1 RequestID FROM Requests WHERE CategoryID = @id');
        if (requestCheck.recordset.length > 0) {
            throw new BadRequestError('ไม่สามารถลบได้ เนื่องจากมีคำร้องใช้งานหมวดหมู่นี้อยู่');
        }
    
        const workflowCheck = await request.query('SELECT TOP 1 TransitionID FROM WorkflowTransitions WHERE CategoryID = @id');
        if (workflowCheck.recordset.length > 0) {
            throw new BadRequestError('ไม่สามารถลบได้ เนื่องจากมี Workflow ผูกกับหมวดหมู่นี้');
        }
    
        await request.query('DELETE FROM Categories WHERE CategoryID = @id');
    }

    // --- Location CRUD ---
    static async createLocation(name, categoryIds) {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            const result = await new sql.Request(transaction)
                .input('name', sql.NVarChar, name)
                .query('INSERT INTO Locations (LocationName) OUTPUT Inserted.LocationID VALUES (@name)');
            
            const newLocationId = result.recordset[0].LocationID;
            if (categoryIds) {
                await updateCategoryMappingsForLocation(newLocationId, categoryIds, transaction);
            }
            await transaction.commit();
            return { LocationID: newLocationId };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
    static async updateLocation(id, name, categoryIds) {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            await new sql.Request(transaction)
                .input('id', sql.Int, id)
                .input('name', sql.NVarChar, name)
                .query('UPDATE Locations SET LocationName = @name WHERE LocationID = @id');
            
            if (typeof categoryIds !== 'undefined') {
                await updateCategoryMappingsForLocation(id, categoryIds, transaction);
            }
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
    static async deleteLocation(id) {
        const pool = getPool();
        await pool.request().input('id', sql.Int, id).query('DELETE FROM Locations WHERE LocationID = @id');
    }
    
    static async getCategoryMappingsForLocation(locationId) {
        return getCategoryMappingsForLocation(locationId);
    }
    
    // --- Status CRUD ---
    static async updateStatus(id, { name, colorCode }) {
        const pool = getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('colorCode', sql.NVarChar, colorCode)
            .query('UPDATE Statuses SET StatusName = @name, ColorCode = @colorCode WHERE StatusID = @id');
    }

    // --- Document Config ---
    static async getDocConfigs() {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT dc.*, c.CategoryName 
            FROM DocumentNumberConfig dc
            JOIN Categories c ON dc.CategoryID = c.CategoryID
            ORDER BY dc.Year DESC, c.CategoryName
        `);
        return result.recordset;
    }

    static async upsertDocConfig(configData) {
        const { categoryId, year, prefix, lastRunningNumber, configId } = configData;
        const pool = getPool();
        if (configId) {
            await pool.request()
                .input('id', sql.Int, configId)
                .input('prefix', sql.NVarChar, prefix)
                .input('lastRunningNumber', sql.Int, lastRunningNumber)
                .query('UPDATE DocumentNumberConfig SET Prefix = @prefix, LastRunningNumber = @lastRunningNumber WHERE ConfigID = @id');
        } else {
            await pool.request()
                .input('categoryId', sql.Int, categoryId)
                .input('year', sql.Int, year)
                .input('prefix', sql.NVarChar, prefix)
                .input('lastRunningNumber', sql.Int, lastRunningNumber)
                .query('INSERT INTO DocumentNumberConfig (CategoryID, Year, Prefix, LastRunningNumber) VALUES (@categoryId, @year, @prefix, @lastRunningNumber)');
        }
    }

    // --- Correction Types ---
    static async getCorrectionTypes(categoryId = null) {
        const pool = getPool();
        const request = pool.request();
        
        let query = `
            SELECT ct.* FROM CorrectionTypes ct
        `;

        if (categoryId) {
            query += `
                JOIN CategoryCorrectionTypeMappings ccm ON ct.CorrectionTypeID = ccm.CorrectionTypeID
                WHERE ct.IsActive = 1 AND ccm.CategoryID = @CategoryID
            `;
            request.input('CategoryID', sql.Int, categoryId);
        } else {
            query += ' WHERE ct.IsActive = 1';
        }

        query += ' ORDER BY ct.Priority, ct.CorrectionTypeName';
        
        const result = await request.query(query);
        return result.recordset;
    }

    static async getCorrectionTypesByIds(typeIds) {
        if (!typeIds || typeIds.length === 0) return [];
        const pool = getPool();
        const request = pool.request();
        const idParams = typeIds.map((id, index) => `@id${index}`);
        typeIds.forEach((id, index) => request.input(`id${index}`, sql.Int, id));
        
        const result = await request.query(`SELECT * FROM CorrectionTypes WHERE CorrectionTypeID IN (${idParams.join(',')})`);
        return result.recordset;
    }

    // --- Correction Reasons ---
    static async getCorrectionReasons() {
        const pool = getPool();
        const result = await pool.request().query('SELECT * FROM CorrectionReasons WHERE IsActive = 1 ORDER BY ReasonID');
        return result.recordset;
    }

    // --- Workflow Preview ---
    static async getWorkflowPreview({ categoryId, correctionTypeIds = [] }) {
        const pool = getPool();
        
        let highestPriorityTypeId = null;
        if (correctionTypeIds.length > 0) {
            const typesFromDb = await this.getCorrectionTypesByIds(correctionTypeIds);
            if (typesFromDb.length > 0) {
                typesFromDb.sort((a, b) => a.Priority - b.Priority);
                highestPriorityTypeId = typesFromDb[0].CorrectionTypeID;
            }
        }
        
        const request = pool.request().input('CategoryID', sql.Int, categoryId);
        
        let transitionsResult;
        if (highestPriorityTypeId) {
            request.input('CorrectionTypeID', sql.Int, highestPriorityTypeId);
            transitionsResult = await request.query(`
                SELECT t.CurrentStatusID, t.NextStatusID, r.RoleName AS ApproverRoleName, a.ActionName
                FROM WorkflowTransitions t
                JOIN Roles r ON t.RequiredRoleID = r.RoleID
                JOIN Actions a ON t.ActionID = a.ActionID
                WHERE t.CategoryID = @CategoryID AND t.CorrectionTypeID = @CorrectionTypeID
            `);
            if (transitionsResult.recordset.length === 0) {
                transitionsResult = await pool.request()
                    .input('CategoryID', sql.Int, categoryId)
                    .query(`
                        SELECT t.CurrentStatusID, t.NextStatusID, r.RoleName AS ApproverRoleName, a.ActionName
                        FROM WorkflowTransitions t
                        JOIN Roles r ON t.RequiredRoleID = r.RoleID
                        JOIN Actions a ON t.ActionID = a.ActionID
                        WHERE t.CategoryID = @CategoryID AND t.CorrectionTypeID IS NULL
                    `);
            }
        } else {
             transitionsResult = await pool.request()
                .input('CategoryID', sql.Int, categoryId)
                .query(`
                    SELECT t.CurrentStatusID, t.NextStatusID, r.RoleName AS ApproverRoleName, a.ActionName
                    FROM WorkflowTransitions t
                    JOIN Roles r ON t.RequiredRoleID = r.RoleID
                    JOIN Actions a ON t.ActionID = a.ActionID
                    WHERE t.CategoryID = @CategoryID AND t.CorrectionTypeID IS NULL
                `);
        }
        
        const transitions = transitionsResult.recordset;
        if (transitions.length === 0) return [];
        
        const workflowPath = [];
        let currentStatusId = 1;
        const visitedStatuses = new Set();
        
        while (currentStatusId && !visitedStatuses.has(currentStatusId)) {
            visitedStatuses.add(currentStatusId);
            const approveTransition = transitions.find(t => t.CurrentStatusID === currentStatusId && t.ActionName === 'APPROVE');
            if (approveTransition) {
                 workflowPath.push({ ApproverRoleName: approveTransition.ApproverRoleName });
                 currentStatusId = approveTransition.NextStatusID;
            } else {
                break;
            }
            if (currentStatusId === 4) break; 
        }

        return workflowPath;
    }
}

module.exports = MasterData;