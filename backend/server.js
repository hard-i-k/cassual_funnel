const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/user_analytics';

// Middleware
// Enable CORS for frontend (port 3000) and any origin
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'User Analytics API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      events: 'POST /api/events',
      sessions: 'GET /api/sessions',
      sessionEvents: 'GET /api/sessions/:sessionId/events',
      heatmap: 'GET /api/heatmap?page_url={url}',
      pages: 'GET /api/pages',
    },
  });
});

// Import route modules
const eventsRouter = require('./routes/events');
const sessionsRouter = require('./routes/sessions');
const heatmapRouter = require('./routes/heatmap');
const pagesRouter = require('./routes/pages');

// Mount routes
app.use('/api/events', eventsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/heatmap', heatmapRouter);
app.use('/api/pages', pagesRouter);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error] Server caught unhandled error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: messages,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate record exists',
    });
  }

  // CastError (e.g. invalid ObjectId or parameter format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid format for field: ${err.path}`,
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Database Connection and Server Startup
async function startServer() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}`);
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`Ready to receive events at http://localhost:${PORT}/api/events`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    console.log('Server starting without active database connection; requests requiring DB may fail.');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT} (Database disconnected)`);
    });
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
