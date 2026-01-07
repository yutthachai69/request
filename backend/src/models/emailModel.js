// backend/src/models/emailModel.js
const { getPool, sql } = require('../config/db');

class EmailModel {
    static async getTemplateByName(templateName) {
        const pool = getPool();
        const result = await pool.request()
            .input('TemplateName', sql.NVarChar, templateName)
            .query('SELECT * FROM EmailTemplates WHERE TemplateName = @TemplateName');
        return result.recordset[0];
    }

    static async logEmail(logData) {
        const { requestId, sentTo, subject, status, errorMessage = null } = logData;
        const pool = getPool();
        await pool.request()
            .input('RequestID', sql.Int, requestId)
            .input('SentTo', sql.NVarChar, sentTo)
            .input('Subject', sql.NVarChar, subject)
            .input('Status', sql.NVarChar, status)
            .input('ErrorMessage', sql.NVarChar, errorMessage)
            .query(`
                INSERT INTO EmailLog (RequestID, SentTo, Subject, Status, ErrorMessage)
                VALUES (@RequestID, @SentTo, @Subject, @Status, @ErrorMessage)
            `);
    }
    
    // --- For Admin UI ---
    static async getAllTemplates() {
        const pool = getPool();
        const result = await pool.request().query('SELECT * FROM EmailTemplates ORDER BY TemplateName');
        return result.recordset;
    }

    static async updateTemplate(id, data) {
        const { subject, body } = data;
        const pool = getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .input('subject', sql.NVarChar, subject)
            .input('body', sql.NVarChar(sql.MAX), body)
            .query('UPDATE EmailTemplates SET Subject = @subject, Body = @body WHERE TemplateID = @id');
    }
}

module.exports = EmailModel;