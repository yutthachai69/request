# Request System

ระบบจัดการคำขอออนไลน์ (Request Management System)

## การตั้งค่า Logging

ระบบรองรับการจัดการ Logging ที่ยืดหยุ่นสำหรับทั้ง Development และ Production

### Environment Variables สำหรับ Logging

ในไฟล์ `.env` (หรือ `.env.example`) สามารถตั้งค่าได้ดังนี้:

#### `LOG_LEVEL`
- **Default:** `info` (development) หรือ `warn` (production)
- **ค่าที่ใช้ได้:** `silly`, `debug`, `info`, `warn`, `error`
- **คำแนะนำ:**
  - **Development:** ใช้ `info` หรือ `debug` เพื่อดู log ทั้งหมด
  - **Production:** ใช้ `warn` หรือ `error` เพื่อลด log และแสดงเฉพาะ warning/error

#### `ENABLE_CONSOLE_LOG`
- **Default:** `true`
- **ค่าที่ใช้ได้:** `true` หรือ `false`
- **คำแนะนำ:**
  - **Development:** ตั้งเป็น `true` เพื่อดู log ใน console
  - **Production:** ตั้งเป็น `false` เพื่อปิด console log และบันทึกลงไฟล์เท่านั้น

### ตัวอย่างการตั้งค่า

#### Development (.env)
```env
NODE_ENV=development
LOG_LEVEL=info
ENABLE_CONSOLE_LOG=true
```

#### Production (.env)
```env
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_CONSOLE_LOG=false
```

### Log Files (Production Only)

เมื่อ `NODE_ENV=production` ระบบจะสร้างไฟล์ log ในโฟลเดอร์ `backend/logs/`:
- `error.log`: บันทึกเฉพาะ error level
- `combined.log`: บันทึกทุก log level

ไฟล์ log จะ rotate อัตโนมัติเมื่อไฟล์มีขนาดเกิน 5MB และเก็บได้สูงสุด 5 ไฟล์ต่อ type

## การติดตั้งและใช้งาน

1. Copy `.env.example` เป็น `.env` และตั้งค่าตามสภาพแวดล้อม
2. ติดตั้ง dependencies: `npm install`
3. รัน server: `npm start` (production) หรือ `npm run dev` (development)

## Security Features

- JWT Authentication
- Rate Limiting
- XSS Protection
- Helmet.js Security Headers
- Request Timeout
- Request Body Size Limits
- Graceful Shutdown
- Error Handling & Logging 
