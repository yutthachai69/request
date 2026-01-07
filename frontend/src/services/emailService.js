// frontend/src/services/emailService.js
import axios from 'axios';

/**
 * ส่งอีเมลผ่าน Internal Email Proxy API
 * @param {object} emailData - { to, subject, body, cc, bcc }
 */
const sendEmail = async (emailData) => {
    const apiUrl = import.meta.env.VITE_INTERNAL_EMAIL_API_URL;
    if (!apiUrl) {
        console.warn('EMAIL WARNING: VITE_INTERNAL_EMAIL_API_URL is not set in .env. Skipping email.');
        return Promise.reject(new Error('Email API URL not configured'));
    }

    // 💡 1. ปรับแก้ Payload ให้ตรงตาม API Specification ที่ให้มา
    const payload = {
        businessUnit: "TUSM", // กำหนดค่าตามตัวอย่าง
        appName: "RequestOnlineSystem", // ชื่อแอปพลิเคชันของเรา
        subject: emailData.subject,
        body: emailData.body,
        to: emailData.to, // ควรเป็น Array ของ string
        cc: emailData.cc || [],
        bcc: emailData.bcc || [],
        attachments: [] // ปัจจุบันยังไม่มีการส่งไฟล์แนบ
    };

    try {
        await axios.post(apiUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        console.log(`Email sent successfully to: ${emailData.to.join(', ')}`);
        return { success: true };
    } catch (error) {
        console.error('--- EMAIL SENDING FAILED ---');
        
        // 💡 2. ปรับปรุงการจัดการ Error ให้ดึง message ที่เฉพาะเจาะจงจาก API
        if (error.response) {
            console.error('Error Response Status:', error.response.status);
            // ดึง message จากโครงสร้าง error ของ API ที่ให้มา
            const errorMessage = error.response.data?.error?.message || JSON.stringify(error.response.data);
            console.error('Error Response Data:', errorMessage);
            // ส่งต่อ error message ที่เฉพาะเจาะจงมากขึ้น
            throw new Error(errorMessage); 
        } else if (error.request) {
            console.error('Error Request: No response received. Check network/firewall/CORS.');
            throw new Error('No response from email server. Please check network connection.');
        } else {
            console.error('Error Message:', error.message);
            throw error;
        }
    }
};

const emailService = {
    sendEmail,
};

export default emailService;