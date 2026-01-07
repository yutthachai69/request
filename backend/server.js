// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initializeDatabase } = require('./src/config/db');
const path = require('path');
const errorHandler = require('./src/middleware/errorHandler');
const xss = require('xss-clean');
const helmet = require('helmet');
const logger = require('./src/utils/logger'); 
const { auditMiddleware } = require(path.join(__dirname, 'src', 'middleware', 'auditMiddleware'));
const apiLimiter = require('./src/middleware/rateLimiter');
const requestTimeout = require('./src/middleware/timeoutHandler');

const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// --- START: MODIFY SOCKET.IO CORS CONFIGURATION ---
const io = new Server(server, {
  path: '/requestonlineapi/socket.io/',
  cors: {
    // ✅ รองรับทั้ง production และ development URLs
    origin: [
      process.env.FRONTEND_URL || "https://tusmonline.thaisugarmill.com",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://192.168.30.188:5173",
      "http://192.168.36.14",
      "https://192.168.36.14",
      "http://192.168.30.188",
      "https://192.168.30.188"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
// --- END: MODIFY SOCKET.IO CORS CONFIGURATION ---

app.set('io', io);
app.set('trust proxy', 1);

const allowedOrigins = [
    'https://tusmonline.thaisugarmill.com', 
    'http://tusmonline.thaisugarmill.com', 
    'https://192.168.36.14', 
    'http://192.168.36.14',
    'http://192.168.30.188',
    'https://192.168.30.188',
    'http://localhost:5173',
    'http://192.168.30.188:5173'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: false }));
// ✅ จำกัดขนาด request body เพื่อป้องกัน memory overflow
app.use(express.json({ limit: '10mb' })); // จำกัด JSON body ไม่เกิน 10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // จำกัด URL-encoded body
app.use(xss());

app.use(auditMiddleware);

// ✅ Request Timeout - ป้องกัน request ที่ค้างนานเกินไป (30 วินาที)
app.use(requestTimeout(30000));

// ✅ Global Rate Limiting - ใช้กับทุก API endpoint
// หมายเหตุ: จะ skip อัตโนมัติสำหรับ Admin และ Login route
app.use('/requestonlineapi/api', apiLimiter);

// --- Routing Setup ---
const mainRouter = express.Router();
const apiRouter = express.Router();

mainRouter.get('/', (req, res) => {
  res.send('Request System API is running...');
});

// ✅ Health Check Endpoint - สำหรับตรวจสอบสถานะระบบ
mainRouter.get('/health', (req, res) => {
  const { getPool } = require('./src/config/db');
  const pool = getPool();
  
  // ตรวจสอบ database connection
  if (!pool || !pool.connected) {
    return res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    status: 'healthy',
    database: 'connected',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    timestamp: new Date().toISOString()
  });
});

const authRoutes = require(path.join(__dirname, 'src', 'routes', 'authRoutes'));
apiRouter.use('/auth', authRoutes);
const requestRoutes = require(path.join(__dirname, 'src', 'routes', 'requestRoutes'));
apiRouter.use('/requests', requestRoutes);
const masterDataRoutes = require(path.join(__dirname, 'src', 'routes', 'masterDataRoutes'));
apiRouter.use('/master', masterDataRoutes);
const adminRoutes = require(path.join(__dirname, 'src', 'routes', 'adminRoutes'));
apiRouter.use('/admin', adminRoutes);
const dashboardRoutes = require(path.join(__dirname, 'src', 'routes', 'dashboardRoutes'));
apiRouter.use('/dashboard', dashboardRoutes);
const notificationRoutes = require(path.join(__dirname, 'src', 'routes', 'notificationRoutes'));
apiRouter.use('/notifications', notificationRoutes);

mainRouter.use('/api', apiRouter);

app.use('/requestonlineapi/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/requestonlineapi', mainRouter);

app.get('/', (req, res) => {
  res.send('Request System API is running at root...');
});

app.use(errorHandler);

// ✅ Import crash handlers
require('./src/utils/crashHandler');
const { gracefulShutdown } = require('./src/utils/crashHandler');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initializeDatabase();
    server.listen(PORT, () => logger.info(`🚀 Server started on port ${PORT}`)); 
    
    // ✅ Register graceful shutdown handlers
    process.on('SIGTERM', gracefulShutdown(server));
    process.on('SIGINT', gracefulShutdown(server));
    
  } catch (error) {
    logger.error('FATAL: Failed to start server:', error);
    process.exit(1);
  }
};

io.on('connection', (socket) => {
  logger.info(`A user connected: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

startServer();

module.exports = server;