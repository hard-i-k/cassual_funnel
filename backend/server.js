const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/user_analytics';

// Middleware
// Enable CORS for frontend and tracking script from any origin
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
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: {
      health: 'GET /health',
      events: 'POST /api/events',
      sessions: 'GET /api/sessions',
      sessionEvents: 'GET /api/sessions/:sessionId/events',
      heatmap: 'GET /api/heatmap?page_url={url}',
      pages: 'GET /api/pages',
      demo: 'GET /demo',
    },
  });
});

// Serve tracking files and demo webpage
const path = require('path');
app.use('/demo', express.static(path.join(__dirname, '../tracking')));
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, '../tracking/demo.html'));
});

// Database guard middleware: prevents requests from hanging if MongoDB is not connected
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database connection unavailable. MongoDB is not connected.',
      sessions: [],
      events: [],
      pages: [],
      clicks: [],
    });
  }
  next();
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

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: messages,
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate record exists',
    });
  }

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

// Connect to MongoDB with IPv4 fallback
async function connectToMongo(uri) {
  const options = {
    serverSelectionTimeoutMS: 5000,
  };

  try {
    console.log(`Connecting to MongoDB at: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
    await mongoose.connect(uri, options);
    console.log('MongoDB connected successfully');
    return true;
  } catch (err) {
    console.warn(`Primary connection to ${uri} failed: ${err.message}`);
    // If localhost failed due to Windows IPv6 resolution, fallback to 127.0.0.1
    if (uri.includes('localhost')) {
      const fallbackUri = uri.replace('localhost', '127.0.0.1');
      console.log(`Attempting IPv4 fallback connection at: ${fallbackUri}`);
      try {
        await mongoose.connect(fallbackUri, options);
        console.log('MongoDB connected successfully via IPv4 fallback (127.0.0.1)');
        return true;
      } catch (fallbackErr) {
        console.error('Fallback connection failed:', fallbackErr.message);
      }
    }
    return false;
  }
}

// Database Connection and Server Startup
async function startServer() {
  const isConnected = await connectToMongo(MONGODB_URI);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (${isConnected ? 'Database connected' : 'Database DISCONNECTED'})`);
    console.log(`API health: http://localhost:${PORT}/health`);
    console.log(`Ready to receive events at http://localhost:${PORT}/api/events`);
  });
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
