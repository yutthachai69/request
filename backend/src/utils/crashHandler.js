// backend/src/utils/crashHandler.js
const logger = require('./logger');

// ✅ จัดการ Uncaught Exceptions (Errors ที่ไม่ได้ catch)
process.on('uncaughtException', (err) => {
    logger.error('💥 UNCAUGHT EXCEPTION! Shutting down...', {
        name: err.name,
        message: err.message,
        stack: err.stack
    });
    
    // ให้เวลา server ปิด connection ที่ค้างอยู่
    setTimeout(() => {
        process.exit(1); // Exit with failure
    }, 1000);
});

// ✅ จัดการ Unhandled Promise Rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 UNHANDLED REJECTION! Shutting down...', {
        reason: reason,
        promise: promise
    });
    
    // ให้เวลา server ปิด connection ที่ค้างอยู่
    setTimeout(() => {
        process.exit(1); // Exit with failure
    }, 1000);
});

// ✅ Graceful Shutdown Handler
const gracefulShutdown = (server) => {
    return (signal) => {
        logger.info(`📴 ${signal} received. Starting graceful shutdown...`);
        
        server.close(() => {
            logger.info('✅ HTTP server closed.');
            
            // ปิด database connections
            try {
                const { getPool } = require('../config/db');
                const pool = getPool();
                if (pool && pool.connected) {
                    pool.close().then(() => {
                        logger.info('✅ Database connections closed.');
                        process.exit(0);
                    }).catch((err) => {
                        logger.error('❌ Error closing database:', err);
                        process.exit(1);
                    });
                } else {
                    process.exit(0);
                }
            } catch (err) {
                logger.error('❌ Error during shutdown:', err);
                process.exit(1);
            }
        });
        
        // Force close after 10 seconds
        setTimeout(() => {
            logger.error('⚠️ Forcing shutdown after timeout');
            process.exit(1);
        }, 10000);
    };
};

module.exports = { gracefulShutdown };

