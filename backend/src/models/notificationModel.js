// backend/src/models/notificationModel.js
const { getPool, sql } = require('../config/db');
const { getCurrentBangkokTime } = require('../utils/dateHelper'); // 💡 เพิ่มบรรทัดนี้

class Notification {
    /**
     * สร้างการแจ้งเตือนใหม่
     * @param {object} notifData - { userId, message, requestId }
     */
    static async create({ userId, message, requestId = null }) {
        const pool = getPool();
        await pool.request()
            .input('UserID', sql.Int, userId)
            .input('Message', sql.NVarChar, message)
            .input('RequestID', sql.Int, requestId)
            // ===== 💡 START: เพิ่มการส่งค่า CreatedAt 💡 =====
            .input('CreatedAt', sql.DateTime, getCurrentBangkokTime())
            .query('INSERT INTO Notifications (UserID, Message, RequestID, CreatedAt) VALUES (@UserID, @Message, @RequestID, @CreatedAt)');
            // ===== 🔥 END: เพิ่มการส่งค่า CreatedAt 🔥 =====
    }

    /**
     * ดึงการแจ้งเตือนทั้งหมดของผู้ใช้
     * @param {number} userId 
     */
    static async getForUser(userId) {
        const pool = getPool();
        const result = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
                SELECT TOP 20 * FROM Notifications 
                WHERE UserID = @UserID 
                ORDER BY CreatedAt DESC
            `);
        return result.recordset;
    }

    /**
     * อัปเดตสถานะการแจ้งเตือนเป็น "อ่านแล้ว"
     * @param {number} notificationId 
     * @param {number} userId 
     */
    static async markAsRead(notificationId, userId) {
        const pool = getPool();
        await pool.request()
            .input('NotificationID', sql.Int, notificationId)
            .input('UserID', sql.Int, userId) // Ensure user can only mark their own notifications as read
            .query('UPDATE Notifications SET IsRead = 1 WHERE NotificationID = @NotificationID AND UserID = @UserID');
    }

    // ===== ฟังก์ชันที่เพิ่มเข้ามาใหม่ =====
    /**
     * อัปเดตการแจ้งเตือนทั้งหมดของผู้ใช้คนหนึ่งให้เป็น "อ่านแล้ว"
     * @param {number} userId 
     */
    static async markAllAsReadForUser(userId) {
        const pool = getPool();
        await pool.request()
            .input('UserID', sql.Int, userId)
            .query('UPDATE Notifications SET IsRead = 1 WHERE UserID = @UserID AND IsRead = 0');
    }
    // ===================================
}

module.exports = Notification;