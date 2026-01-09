require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initializeDatabase, getPool, sql } = require('../src/config/db');

const reset = async () => {
  try {
    await initializeDatabase();
    const hash = await bcrypt.hash('It@123456', 10);
    const pool = getPool();
    const q = `
      UPDATE Users
      SET Password = @pwd, IsActive = 1
      WHERE Username = 'admin';
    `;
    const result = await pool.request()
      .input('pwd', sql.NVarChar, hash)
      .query(q);
    console.log('Rows affected:', result.rowsAffected);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

reset();


