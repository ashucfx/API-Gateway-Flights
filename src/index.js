const express = require('express');
const cors = require('cors');
const {serverConfig, Logger} = require('./config');
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

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

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

app.use('/api',apiRoutes);

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

app.listen(serverConfig.PORT,()=>{
    console.log(`Successfully started the server at port ${serverConfig.PORT}`);
    Logger.info('Successfully Started The Server','root',{});
  }) 