const express = require('express');
const cors = require('cors');
const { serverConfig, Logger } = require('./config');
const apiRoutes = require('./routes');

const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Configurable rate limiter
const limiter = rateLimit({
  windowMs: serverConfig.RATE_LIMIT_WINDOW_MS,
  max: serverConfig.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.'
});

const app = express();

// CORS configuration - only allow specified origins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://localhost:3002', 'http://frontend:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(limiter);

app.use(
  '/flightsService',
  createProxyMiddleware({
    target: serverConfig.FLIGHT_SERVICE,
    changeOrigin: true,
  }),
);

app.use(
  '/bookingService',
  createProxyMiddleware({
    target: serverConfig.BOOKING_SERVICE,
    changeOrigin: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is healthy',
    timestamp: new Date().toISOString(),
    service: 'API Gateway',
    uptime: process.uptime()
  });
});

app.use('/api', apiRoutes);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  Logger.error('Unhandled Exception', 'error-middleware', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: {},
    error: err.explanation || err
  });
});

app.listen(serverConfig.PORT, () => {
  console.log(`Successfully started the server at port ${serverConfig.PORT}`);
  Logger.info('Successfully Started The Server', 'root', {});
}) 