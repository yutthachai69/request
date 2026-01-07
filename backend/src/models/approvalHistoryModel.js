// backend/src/models/approvalHistoryModel.js
const { getPool, sql } = require('../config/db');
const { getCurrentBangkokTime } = require('../utils/dateHelper');

class ApprovalHistory {
    static async getForRequest(requestId) {
    const pool = getPool();
    const result = await pool.request()
        .input('requestId', sql.Int, requestId)
        .query(`
            SELECT ah.*, u.FullName, r.RoleName 
            FROM ApprovalHistory ah
            JOIN Users u ON ah.ApproverID = u.UserID
            LEFT JOIN Roles r ON u.RoleID = r.RoleID
            WHERE ah.RequestID = @requestId
            ORDER BY ah.ApprovalTimestamp ASC
        `);
    return result.recordset;
}

    static async create({ requestId, approverId, approvalLevel, actionType, comment, transaction }) {
        const request = transaction ? new sql.Request(transaction) : getPool().request();
        
        await request
            .input('RequestID', sql.Int, requestId)
            .input('ApproverID', sql.Int, approverId)
            .input('ApprovalLevel', sql.Decimal(4, 2), approvalLevel)
            .input('ActionType', sql.NVarChar, actionType)
            .input('Comment', sql.NVarChar, comment)
            .input('ApprovalTimestamp', sql.DateTime2, getCurrentBangkokTime())
            .query(`
                INSERT INTO ApprovalHistory (RequestID, ApproverID, ApprovalLevel, ActionType, Comment, ApprovalTimestamp)
                VALUES (@RequestID, @ApproverID, @ApprovalLevel, @ActionType, @Comment, @ApprovalTimestamp)
            `);
    }
}

module.exports = ApprovalHistory;