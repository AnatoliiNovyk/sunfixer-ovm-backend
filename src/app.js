const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import Sentry for error tracking
const Sentry = require('@sentry/node');

// Import custom modules
const logger = require('./utils/logger');
const database = require('./database/connection');
const { setupAdmin } = require('./admin/config');

// Import routes
const authRoutes = require('./routes/auth');
const releasesRoutes = require('./routes/releases');
const eventsRoutes = require('./routes/events');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const uploadRoutes = require('./routes/upload');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Sentry
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
    });
    
    // Sentry request handler must be first middleware
    app.use(Sentry.Handlers.requestHandler());
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    skip: (req) => req.path.startsWith('/admin')
});

// Middleware
app.use(limiter);

// Setup Admin panel before helmet (CSP)
setupAdmin(app);

app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (skip /admin)
app.use((req, res, next) => {
    if (!req.path.startsWith('/admin')) {
        logger.info(`${req.method} ${req.path} - ${req.ip}`);
    }
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'SunFixer & OVM Backend API',
        version: '1.0.0',
        admin_panel: '/admin'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/releases', releasesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploaded files
app.use('/uploads', express.static('src/uploads'));

// 404 for non-admin
app.use('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/admin')) return next();
    res.status(404).json({
        error: 'Route not found',
        message: `The requested route ${req.originalUrl} does not exist.`,
        hint: 'Admin panel available at /admin'
    });
});

// Sentry error handler
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}

// Global error handler
app.use((error, req, res, next) => {
    if (!req.path.startsWith('/admin')) {
        logger.error(`Error: ${error.message}`, {
            stack: error.stack,
            url: req.url,
            method: req.method,
            ip: req.ip
        });
    }
    res.status(error.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
});

const startServer = async () => {
    try {
        await database.testConnection();
        logger.info('Database connection successful');
        
        app.listen(PORT, () => {
            logger.info(`API running on port ${PORT}`);
            logger.info(`Admin Panel: http://localhost:${PORT}/admin`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;