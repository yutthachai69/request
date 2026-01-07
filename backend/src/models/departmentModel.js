// backend/src/models/departmentModel.js
const { getPool, sql } = require('../config/db');
const { BadRequestError } = require('../utils/errors');

class Department {
    static async getAll() {
        const pool = getPool();
        const result = await pool.request()
            .query('SELECT * FROM Departments WHERE IsActive = 1 ORDER BY DepartmentName');
        return result.recordset;
    }

    static async getAllAdmin() {
        const pool = getPool();
        const result = await pool.request()
            .query('SELECT * FROM Departments ORDER BY DepartmentName');
        return result.recordset;
    }

    static async findById(id) {
        const pool = getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Departments WHERE DepartmentID = @id');
        return result.recordset[0];
    }

    static async create(departmentName) {
        const pool = getPool();
        await pool.request()
            .input('departmentName', sql.NVarChar, departmentName)
            .query('INSERT INTO Departments (DepartmentName) VALUES (@departmentName)');
    }

    static async update(id, data) {
        const { departmentName, isActive } = data;
        const pool = getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .input('departmentName', sql.NVarChar, departmentName)
            .input('isActive', sql.Bit, isActive)
            .query('UPDATE Departments SET DepartmentName = @departmentName, IsActive = @isActive WHERE DepartmentID = @id');
    }

    static async delete(id) {
        const pool = getPool();
        const request = pool.request().input('id', sql.Int, id);

        const userCheck = await request.query('SELECT TOP 1 UserID FROM Users WHERE DepartmentID = @id');
        if (userCheck.recordset.length > 0) {
            throw new BadRequestError('ไม่สามารถลบแผนกได้ เนื่องจากมีผู้ใช้งานอยู่ในแผนกนี้');
        }

        await request.query('DELETE FROM Departments WHERE DepartmentID = @id');
    }
}

module.exports = Department;