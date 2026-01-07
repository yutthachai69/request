// backend/src/utils/emailTemplates.js
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const mainTemplate = (title, content) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2 style="color: #1976d2;">${title}</h2>
    ${content}
    <p>ขอบคุณครับ</p>
    <p><strong>ระบบแจ้งขอแก้ไขข้อมูลออนไลน์</strong></p>
  </div>
`;

const getRequestLink = (requestId) => `${FRONTEND_URL}/request/${requestId}`;

const getApprovalEmail = (request) => {
    const link = getRequestLink(request.RequestID);
    const subject = `[รออนุมัติ] คำร้อง #${request.RequestNumber || request.RequestID} (${request.CategoryName})`;
    const content = `
        <p>สวัสดีครับ,</p>
        <p>มีคำร้องใหม่รอการอนุมัติจากท่าน</p>
        <ul>
            <li><strong>เลขที่:</strong> ${request.RequestNumber || request.RequestID}</li>
            <li><strong>หมวดหมู่:</strong> ${request.CategoryName}</li>
            <li><strong>ผู้แจ้ง:</strong> ${request.RequesterFullName}</li>
        </ul>
        <p>กรุณาตรวจสอบและดำเนินการต่อได้ที่ลิงก์ด้านล่างนี้:</p>
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: #fff; text-decoration: none; border-radius: 5px;">ดูรายละเอียดคำร้อง</a>
    `;
    return { subject, html: mainTemplate('แจ้งเตือนเพื่ออนุมัติคำร้อง', content) };
};

const getRevisionEmail = (request) => {
    const link = getRequestLink(request.RequestID);
    const subject = `[แจ้งเพื่อแก้ไข] คำร้อง #${request.RequestNumber || request.RequestID} ของคุณถูกส่งกลับ`;
    const content = `
        <p>เรียน ${request.RequesterFullName},</p>
        <p>คำร้องของคุณถูกส่งกลับมาเพื่อทำการแก้ไข กรุณาตรวจสอบความคิดเห็นจากผู้อนุมัติและดำเนินการแก้ไขที่ลิงก์ด้านล่างนี้:</p>
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #ed6c02; color: #fff; text-decoration: none; border-radius: 5px;">ไปที่คำร้องเพื่อแก้ไข</a>
    `;
    return { subject, html: mainTemplate('แจ้งเตือนเพื่อแก้ไขคำร้อง', content) };
};

const getCompletionEmail = (request) => {
    const link = getRequestLink(request.RequestID);
    const subject = `[เสร็จสิ้น] คำร้อง #${request.RequestNumber || request.RequestID} ของคุณดำเนินการเรียบร้อยแล้ว`;
    const content = `
        <p>เรียน ${request.RequesterFullName},</p>
        <p>คำร้องของคุณได้รับการดำเนินการเสร็จสิ้นเรียบร้อยแล้ว ท่านสามารถตรวจสอบรายละเอียดได้ที่ลิงก์ด้านล่างนี้:</p>
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #2e7d32; color: #fff; text-decoration: none; border-radius: 5px;">ดูรายละเอียดคำร้อง</a>
    `;
    return { subject, html: mainTemplate('แจ้งเตือนคำร้องเสร็จสิ้น', content) };
};

module.exports = {
    getApprovalEmail,
    getRevisionEmail,
    getCompletionEmail,
};