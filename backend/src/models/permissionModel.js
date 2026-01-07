// backend/src/models/permissionModel.js
const { getPool, sql } = require('../config/db');

class Permission {
    static async check(userId, categoryId) {
        const pool = getPool();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('categoryId', sql.Int, categoryId)
            .query('SELECT COUNT(*) as count FROM UserCategoryPermissions WHERE UserID = @userId AND CategoryID = @categoryId');
        
        return result.recordset[0].count > 0;
    }
    
    static async getForUser(userId) {
        const pool = getPool();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT CategoryID FROM UserCategoryPermissions WHERE UserID = @userId');
        return result.recordset.map(row => row.CategoryID);
    }

    static async updateForUser(userId, categoryIds = []) {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            const request = new sql.Request(transaction);

            await request.input('userId_del', sql.Int, userId).query('DELETE FROM UserCategoryPermissions WHERE UserID = @userId_del');

            if (categoryIds.length > 0) {
                for (const categoryId of categoryIds) {
                    const insertRequest = new sql.Request(transaction);
                    await insertRequest
                        .input('userId_ins', sql.Int, userId)
                        .input('categoryId_ins', sql.Int, categoryId)
                        .query('INSERT INTO UserCategoryPermissions (UserID, CategoryID) VALUES (@userId_ins, @categoryId_ins)');
                }
            }

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    static async findUsersByRoleAndCategory(roleId, categoryId, filterByDept = false, requesterDepartmentId = null) {
        const pool = getPool();
        const request = pool.request()
            .input('roleId', sql.Int, roleId)
            .input('categoryId', sql.Int, categoryId);

        let query = `
            SELECT u.UserID, u.Email
            FROM Users u
            JOIN UserCategoryPermissions p ON u.UserID = p.UserID
            WHERE u.RoleID = @roleId 
              AND p.CategoryID = @categoryId 
              AND u.IsActive = 1
        `;

        if (filterByDept && requesterDepartmentId) {
            query += ' AND (u.DepartmentID = @departmentId OR u.DepartmentID IS NULL)';
            request.input('departmentId', sql.Int, requesterDepartmentId);
        } else if (filterByDept) {
            query += ' AND u.DepartmentID IS NULL';
        }

        const result = await request.query(query);
        return result.recordset;
    }

    static async findUsersBySpecialRole(roleId, categoryId) {
        const pool = getPool();
        const result = await pool.request()
            .input('roleId', sql.Int, roleId)
            .input('categoryId', sql.Int, categoryId)
            .query(`
                SELECT u.UserID, u.Email
                FROM Users u
                JOIN UserSpecialRoles usr ON u.UserID = usr.UserID
                JOIN UserCategoryPermissions ucp ON u.UserID = ucp.UserID
                WHERE usr.RoleID = @roleId
                  AND ucp.CategoryID = @categoryId
                  AND u.IsActive = 1
            `);
        return result.recordset;
    }

    static async checkUserHasRole(userId, roleId) {
        const pool = getPool();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('roleId', sql.Int, roleId)
            .query('SELECT COUNT(*) as count FROM UserSpecialRoles WHERE UserID = @userId AND RoleID = @roleId');
        
        return result.recordset[0].count > 0;
    }
}

module.exports = Permission;