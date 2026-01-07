// frontend/src/helpers/emailTemplateHelper.js

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_BASE_URL || 'https://tusmonline.thaisugarmill.com/requestonline';

const mainTemplate = (title, content) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2 style="color: #1976d2;">${title}</h2>
    ${content}
    <p>ขอบคุณครับ</p>
    <p><strong>ระบบแจ้งขอแก้ไขข้อมูลออนไลน์</strong></p>
  </div>
`;

const getRequestLink = (requestId) => `${FRONTEND_URL}/request/${requestId}`;

export const getApprovalEmail = (requestData) => {
    const { requestId, requestNumber, categoryName, requesterName } = requestData;
    const link = getRequestLink(requestId);
    const subject = `[รออนุมัติ] คำร้อง #${requestNumber || requestId} (${categoryName})`;
    const content = `
        <p>สวัสดีครับ,</p>
        <p>มีคำร้องใหม่รอการอนุมัติจากท่าน</p>
        <ul>
            <li><strong>เลขที่:</strong> ${requestNumber || requestId}</li>
            <li><strong>หมวดหมู่:</strong> ${categoryName}</li>
            <li><strong>ผู้แจ้ง:</strong> ${requesterName}</li>
        </ul>
        <p>กรุณาตรวจสอบและดำเนินการต่อได้ที่ลิงก์ด้านล่างนี้:</p>
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: #fff; text-decoration: none; border-radius: 5px;">ดูรายละเอียดคำร้อง</a>
    `;
    return { subject, body: mainTemplate('แจ้งเตือนเพื่ออนุมัติคำร้อง', content) };
};

export const getRevisionEmail = (requestData, recipient) => {
    const { requestId, requestNumber } = requestData;
    const link = getRequestLink(requestId);
    const subject = `[แจ้งเพื่อแก้ไข] คำร้อง #${requestNumber || requestId} ของคุณถูกส่งกลับ`;
    const content = `
        <p>เรียน ${recipient.fullName},</p>
        <p>คำร้องของคุณถูกส่งกลับมาเพื่อทำการแก้ไข กรุณาตรวจสอบความคิดเห็นจากผู้อนุมัติและดำเนินการแก้ไขที่ลิงก์ด้านล่างนี้:</p>
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #ed6c02; color: #fff; text-decoration: none; border-radius: 5px;">ไปที่คำร้องเพื่อแก้ไข</a>
    `;
    return { subject, body: mainTemplate('แจ้งเตือนเพื่อแก้ไขคำร้อง', content) };
};

export const getCompletionEmail = (requestData, recipient) => {
    const { requestId, requestNumber } = requestData;
    const link = getRequestLink(requestId);
    const subject = `[เสร็จสิ้น] คำร้อง #${requestNumber || requestId} ของคุณดำเนินการเรียบร้อยแล้ว`;
    const content = `
        <p>เรียน ${recipient.fullName},</p>
        <p>คำร้องของคุณได้รับการดำเนินการเสร็จสิ้นเรียบร้อยแล้ว ท่านสามารถตรวจสอบรายละเอียดได้ที่ลิงก์ด้านล่างนี้:</p>
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #2e7d32; color: #fff; text-decoration: none; border-radius: 5px;">ดูรายละเอียดคำร้อง</a>
    `;
    return { subject, body: mainTemplate('แจ้งเตือนคำร้องเสร็จสิ้น', content) };
};