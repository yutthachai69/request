// frontend/src/services/emailService.js
import axios from 'axios';

// 💡 ใช้ httpsAgent เพื่อแก้ปัญหา SSL Certificate (ถ้าจำเป็น)
// const https = require('https');
// const httpsAgent = new https.Agent({
//     rejectUnauthorized: false
// });

/**
 * ส่งอีเมลผ่าน API Proxy ภายใน
 * @param {object} emailData - { to, subject, body, cc, bcc }
 */
const sendEmail = async (emailData) => {
    const apiUrl = import.meta.env.VITE_INTERNAL_EMAIL_API_URL;
    if (!apiUrl) {
        console.warn('EMAIL WARNING: VITE_INTERNAL_EMAIL_API_URL is not set in .env. Skipping email.');
        // ใน Production อาจจะโยน Error หรือจัดการอย่างอื่น
        return Promise.reject(new Error('Email API URL not configured'));
    }

    const payload = {
        businessUnit: "TUSM_RequestOnline",
        appName: "RequestOnlineSystem",
        subject: emailData.subject,
        body: emailData.body,
        to: emailData.to, // ควรเป็น Array ของ string
        cc: emailData.cc || [],
        bcc: emailData.bcc || [],
        attachments: []
    };

    try {
        // ถ้า API ของคุณต้องการ httpsAgent ให้เพิ่ม config เข้าไปใน axios.post
        // await axios.post(apiUrl, payload, { httpsAgent });
        await axios.post(apiUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        console.log(`Email sent successfully to: ${emailData.to.join(', ')}`);
        return { success: true };
    } catch (error) {
        console.error('--- EMAIL SENDING FAILED ---');
        if (error.response) {
            console.error('Error Response Status:', error.response.status);
            console.error('Error Response Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('Error Request: No response received. Check network/firewall/CORS.');
        } else {
            console.error('Error Message:', error.message);
        }
        throw error; // ส่ง Error ต่อเพื่อให้ component ที่เรียกใช้จัดการได้
    }
};

const emailService = {
    sendEmail,
};

export default emailService;