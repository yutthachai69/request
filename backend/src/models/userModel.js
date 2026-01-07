// backend/src/models/userModel.js
const { getPool, sql } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class User {
    static async findByUsername(username) {
        const pool = getPool();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query(`
                SELECT u.*, d.DepartmentName, r.RoleName, r.AllowBulkActions
                FROM Users u
                LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
                LEFT JOIN Roles r ON u.RoleID = r.RoleID
                WHERE u.Username = @username
            `);
        return result.recordset[0];
    }

    static async create(userData) {
        const { username, hashedPassword, fullName, email, departmentId, position, phoneNumber, roleId } = userData;
        const pool = getPool();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, hashedPassword)
            .input('fullName', sql.NVarChar, fullName)
            .input('email', sql.NVarChar, email)
            .input('departmentId', sql.Int, departmentId)
            .input('position', sql.NVarChar, position)
            .input('phoneNumber', sql.NVarChar, phoneNumber)
            .input('roleId', sql.Int, roleId)
            .query(`
                INSERT INTO Users (Username, Password, FullName, Email, DepartmentID, Position, PhoneNumber, RoleID)
                OUTPUT Inserted.UserID
                VALUES (@username, @password, @fullName, @email, @departmentId, @position, @phoneNumber, @roleId)
            `);
        return result.recordset[0];
    }

    static async findById(id) {
        const numericId = parseInt(id, 10);
        if (isNaN(numericId) || numericId <= 0) {
            return null;
        }
        const pool = getPool();
        const result = await pool.request()
            .input('id', sql.Int, numericId)
            .query(`
                SELECT u.UserID, u.Username, u.Password, u.FullName, u.DepartmentID, d.DepartmentName, 
                       u.Position, u.PhoneNumber, u.RoleID, r.RoleName, u.IsActive, u.Email, r.AllowBulkActions 
                FROM Users u
                LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
                LEFT JOIN Roles r ON u.RoleID = r.RoleID
                WHERE u.UserID = @id
            `);
        
        return result.recordset[0];
    }
    
    static async getAll({ searchTerm = '', page = 1, limit = 5 }) {
        const pool = getPool();
        const request = pool.request();
        
        let fromAndJoins = `
            FROM Users u
            LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
            LEFT JOIN Roles r ON u.RoleID = r.RoleID
        `;
        let whereClause = '';
        if (searchTerm) {
            whereClause = ` WHERE u.Username LIKE @searchTerm OR u.FullName LIKE @searchTerm`;
            request.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
        }

        const countQuery = `SELECT COUNT(*) as totalCount ${fromAndJoins} ${whereClause}`;
        const countResult = await request.query(countQuery);
        const totalCount = countResult.recordset[0].totalCount;
        
        const startRow = (page - 1) * limit + 1;
        const endRow = page * limit;

        const dataQuery = `
            WITH PagedUsers AS (
                SELECT u.UserID, u.Username, u.FullName, d.DepartmentName, 
                       u.Position, u.RoleID, r.RoleName, u.IsActive, u.Email,
                       ROW_NUMBER() OVER (ORDER BY u.UserID) as RowNum
                ${fromAndJoins}
                ${whereClause}
            )
            SELECT * FROM PagedUsers
            WHERE RowNum BETWEEN @startRow AND @endRow;
        `;
        request.input('startRow', sql.Int, startRow);
        request.input('endRow', sql.Int, endRow);
        const dataResult = await request.query(dataQuery);

        return {
            users: dataResult.recordset,
            totalCount: totalCount
        };
    }

    static async update(id, userData) {
        const { FullName, Email, DepartmentID, Position, RoleID, IsActive } = userData;
        const pool = getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('FullName', sql.NVarChar, FullName)
            .input('Email', sql.NVarChar, Email)
            .input('DepartmentID', sql.Int, DepartmentID)
            .input('Position', sql.NVarChar, Position)
            .input('RoleID', sql.Int, RoleID)
            .input('IsActive', sql.Bit, IsActive)
            .query(`
                UPDATE Users 
                SET FullName = @FullName, Email = @Email, DepartmentID = @DepartmentID, 
                    Position = @Position, RoleID = @RoleID, IsActive = @IsActive
                WHERE UserID = @id
            `);
        return result;
    }

    static async updatePassword(id, newHashedPassword) {
        const pool = getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .input('newPassword', sql.NVarChar, newHashedPassword)
            .query('UPDATE Users SET Password = @newPassword WHERE UserID = @id');
    }

    static async getUserStats(userId) {
        const pool = getPool();
        const request = pool.request().input('userId', sql.Int, userId);

        const createdPromise = request.query('SELECT COUNT(*) as count FROM Requests WHERE RequesterID = @userId');
        const approvedPromise = request.query("SELECT COUNT(*) as count FROM ApprovalHistory WHERE ApproverID = @userId AND ActionType NOT LIKE N'%ส่งกลับ%'");
        
        const [createdResult, approvedResult] = await Promise.all([createdPromise, approvedPromise]);

        return {
            requestsCreated: createdResult.recordset[0].count,
            actionsTaken: approvedResult.recordset[0].count,
        };
    }

    static async deleteById(userId) {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            const request = transaction.request();
            request.input('userId', sql.Int, userId);

            const dependencyChecks = [
                { table: 'ApprovalHistory', column: 'ApproverID', message: 'มีประวัติการอนุมัติ' },
                { table: 'Requests', column: 'RequesterID', message: 'มีประวัติการสร้างคำร้อง' }
            ];

            for (const check of dependencyChecks) {
                const result = await request.query(`SELECT TOP 1 1 FROM ${check.table} WHERE ${check.column} = @userId`);
                if (result.recordset.length > 0) {
                    throw new BadRequestError(`ไม่สามารถลบผู้ใช้ได้ เนื่องจากผู้ใช้${check.message}`);
                }
            }
            
            await request.query('DELETE FROM UserCategoryPermissions WHERE UserID = @userId');
            await request.query('UPDATE AuditLogs SET UserID = NULL WHERE UserID = @userId');
            const deleteResult = await request.query('DELETE FROM Users WHERE UserID = @userId');

            if (deleteResult.rowsAffected[0] === 0) {
                 throw new NotFoundError('ไม่พบผู้ใช้ที่ต้องการลบ');
            }

            await transaction.commit();
            return { message: 'ลบผู้ใช้สำเร็จ' };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = User;