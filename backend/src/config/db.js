// backend/src/config/db.js
const sql = require('mssql');
require('dotenv').config();
const logger = require('../utils/logger'); // 💡 เพิ่ม Logger

let pool; 

const initializeDatabase = async () => {
  if (pool && pool.connected) {
    return;
  }
  
  try {
    const dbConfig = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_DATABASE,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
      options: {
        encrypt: true,
        trustServerCertificate: true 
      }
    };

    if (!dbConfig.user || !dbConfig.password || !dbConfig.server || !dbConfig.database) {
      throw new Error('Database environment variables are not fully configured. Check your .env file.');
    }

    logger.info('Attempting to connect to the database...'); // 💡 เปลี่ยนเป็น Logger
    pool = await new sql.ConnectionPool(dbConfig).connect();
    logger.info('✅ SQL Server Connected Successfully.'); // 💡 เปลี่ยนเป็น Logger

    pool.on('error', err => {
      logger.error('SQL Pool Error', err); // 💡 เปลี่ยนเป็น Logger
    });

  } catch (err) {
    logger.error('❌ Database Connection Failed!', err); // 💡 เปลี่ยนเป็น Logger
    process.exit(1); 
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database is not connected. Call initializeDatabase at server startup.');
  }
  return pool;
};

module.exports = { initializeDatabase, getPool, sql };