// backend/src/utils/cache.js
const NodeCache = require('node-cache');

// สร้าง instance ของ cache โดยตั้งค่า standard TTL (Time To Live) เป็น 1 ชั่วโมง
// checkperiod คือความถี่ในการตรวจสอบข้อมูลที่หมดอายุ (ทุก 10 นาที)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

module.exports = cache;