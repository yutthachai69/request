// backend/src/middleware/fileUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = './uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const originalNameWithoutExt = path.parse(originalName).name.replace(/[^a-zA-Z0-9-ก-๙\s]/g, '-');
        const extension = path.extname(originalName);
        cb(null, `${originalNameWithoutExt}-${uniqueSuffix}${extension}`);
    }
});

// ขยายประเภทไฟล์ให้รองรับเอกสารทั่วไปและไฟล์บีบอัด
function checkFileType(file, cb) {
    // อนุญาตไฟล์รูปภาพ, เอกสาร, และไฟล์บีบอัดที่นิยมใช้
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|zip|rar/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    // ตรวจสอบ Mime Type เพื่อความปลอดภัยมากขึ้น (เป็นทางเลือกเสริม)
    // const mimetype = filetypes.test(file.mimetype);

    if (extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: อนุญาตเฉพาะไฟล์รูปภาพ, PDF, Word, Excel, และ ZIP/RAR เท่านั้น!'));
    }
}

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 💡 เพิ่มขนาดไฟล์สูงสุดเป็น 10MB
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
}).array('attachments', 10); // เพิ่มจำนวนไฟล์สูงสุดที่อัปโหลดได้ครั้งละ 10 ไฟล์

module.exports = upload;