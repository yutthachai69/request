// backend/__tests__/server.test.js

const request = require('supertest');
const app = require('../server');
const { connectDB, sql } = require('../src/config/db'); // import connectDB เข้ามาด้วย

describe('Server Health Check', () => {

    // สั่งให้เชื่อมต่อฐานข้อมูล "ก่อน" การทดสอบทั้งหมดจะเริ่ม
    beforeAll(async () => {
        await connectDB();
    });

    // สั่งให้ปิดการเชื่อมต่อ "หลัง" การทดสอบทั้งหมดเสร็จสิ้น
    afterAll(async () => {
        await sql.close();
    });

    it('should respond with 200 OK and a welcome message for GET /', async () => {
        const response = await request(app).get('/');

        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('Request System API is running...');
    });

});