const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { connectDB, getDBHealth } = require('./config/db');

// Load env variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// 1. Security Headers (Helmet)
app.use(helmet());

// 2. CORS Configuration
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
const allowedOrigins = clientUrl.split(',').map(url => url.trim());

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 3. Rate Limiting (Prevent API abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));

// 4. WebSocket setup
const io = socketio(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});
app.set('socketio', io);

// Rewrite legacy /api/* routes to /api/v1/*
app.use((req, res, next) => {
  if (req.url === '/api') {
    req.url = '/api/v1';
  } else if (req.url.startsWith('/api/') && !req.url.startsWith('/api/v1/')) {
    req.url = req.url.replace('/api/', '/api/v1/');
  }
  next();
});

// 5. Versioned API Routes
const authRouter = require('./routes/auth');
const playerRouter = require('./routes/player');
const teamRouter = require('./routes/team');
const tournamentRouter = require('./routes/tournament');
const matchRouter = require('./routes/match');
const leaderboardRouter = require('./routes/leaderboard');

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/players', playerRouter);
app.use('/api/v1/teams', teamRouter);
app.use('/api/v1/tournaments', tournamentRouter);
app.use('/api/v1/matches', matchRouter);
app.use('/api/v1/leaderboards', leaderboardRouter);

// Database Health Check Route
app.get('/api/v1/health', (req, res) => {
  const dbHealth = getDBHealth();
  res.json({
    status: dbHealth.ping === 'ok' ? 'healthy' : 'unhealthy',
    uptime: process.uptime(),
    database: dbHealth,
    timestamp: new Date()
  });
});


// Default Root Route
app.get('/', (req, res) => {
  res.send('CricBeas API Server is running.');
});

// 6. Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'An internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Socket.io Room Logic
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-match', (matchId) => {
    socket.join(`match:${matchId}`);
    console.log(`Socket ${socket.id} joined room match:${matchId}`);
  });

  socket.on('leave-match', (matchId) => {
    socket.leave(`match:${matchId}`);
    console.log(`Socket ${socket.id} left room match:${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// 7. Graceful Shutdown handler
const gracefulShutdown = () => {
  console.log('Received termination signal. Starting graceful shutdown...');
  server.close(() => {
    console.log('HTTP and socket server closed.');
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });

  // Timeout shutdown after 10s if connections linger
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing process exit...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
// Dev server restart trigger
