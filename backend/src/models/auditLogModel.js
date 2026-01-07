// backend/src/models/auditLogModel.js
const { getPool, sql } = require('../config/db');
const { getCurrentBangkokTime } = require('../utils/dateHelper');

class AuditLog {
    static async create({ userId, action, detail, ipAddress }) {
        const pool = getPool();
        const request = pool.request();
        
        request.input('UserID', userId ? sql.Int : null, userId);
        request.input('Action', sql.NVarChar, action);
        request.input('Detail', sql.NVarChar(sql.MAX), detail);
        request.input('IPAddress', sql.NVarChar, ipAddress);
        request.input('Timestamp', sql.DateTime2, getCurrentBangkokTime());

        await request.query(`
            INSERT INTO AuditLogs (UserID, Action, Detail, IPAddress, Timestamp)
            VALUES (@UserID, @Action, @Detail, @IPAddress, @Timestamp)
        `);
    }
    
    // --- START: MODIFY QUERY FOR OLD SQL SERVER ---
    static async getLogs({ page = 1, limit = 20, search = '', userId = null, action = null, startDate = null, endDate = null }) {
        const pool = getPool();
        const request = pool.request();

        const whereConditions = [];
        if (userId) {
            whereConditions.push('al.UserID = @userId');
            request.input('userId', sql.Int, userId);
        }
        if (search) {
            whereConditions.push('(u.FullName LIKE @search OR al.Action LIKE @search OR al.Detail LIKE @search OR al.IPAddress LIKE @search)');
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        if (action) {
            whereConditions.push('al.Action = @action');
            request.input('action', sql.NVarChar, action);
        }
        if (startDate) {
            whereConditions.push('CAST(al.Timestamp AS DATE) >= @startDate');
            request.input('startDate', sql.Date, startDate);
        }
        if (endDate) {
            whereConditions.push('CAST(al.Timestamp AS DATE) <= @endDate');
            request.input('endDate', sql.Date, endDate);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) as totalCount FROM AuditLogs al LEFT JOIN Users u ON al.UserID = u.UserID ${whereClause}`;
        const countResult = await request.query(countQuery);
        const totalCount = countResult.recordset[0].totalCount;
        
        const startRow = (page - 1) * limit + 1;
        const endRow = page * limit;

        const dataQuery = `
            WITH PagedLogs AS (
                SELECT al.*, u.FullName,
                       ROW_NUMBER() OVER (ORDER BY al.Timestamp DESC) as RowNum
                FROM AuditLogs al
                LEFT JOIN Users u ON al.UserID = u.UserID
                ${whereClause}
            )
            SELECT * FROM PagedLogs
            WHERE RowNum BETWEEN @startRow AND @endRow;
        `;
        request.input('startRow', sql.Int, startRow);
        request.input('endRow', sql.Int, endRow);
        const dataResult = await request.query(dataQuery);

        return {
            logs: dataResult.recordset,
            totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit)
        };
    }
    // --- END: MODIFY QUERY FOR OLD SQL SERVER ---

    static async getDistinctActions() {
        const pool = getPool();
        const result = await pool.request().query('SELECT DISTINCT Action FROM AuditLogs ORDER BY Action');
        return result.recordset.map(row => row.Action);
    }
}

module.exports = AuditLog;