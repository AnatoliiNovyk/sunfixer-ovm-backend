// Load environment variables first
require('dotenv').config();

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Validate required environment variables
if (!process.env.DB_PASSWORD) {
    logger.error('DB_PASSWORD is not set. Please configure it in .env file');
    throw new Error('DB_PASSWORD environment variable is required');
}

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sunfixer_ovm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD, // No fallback for security
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Log configuration (without sensitive data)
logger.info('Database configuration loaded:', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    ssl: dbConfig.ssl,
    passwordSet: !!dbConfig.password
});

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Database utilities
const database = {
    // Test database connection
    async testConnection() {
        try {
            const client = await pool.connect();
            const result = await client.query('SELECT NOW()');
            client.release();
            logger.info('Database connection test successful:', result.rows[0]);
            return true;
        } catch (error) {
            logger.error('Database connection test failed:', error);
            throw error;
        }
    },

    // Execute query with error handling
    async query(text, params = []) {
        const start = Date.now();
        try {
            const result = await pool.query(text, params);
            const duration = Date.now() - start;
            
            logger.debug('Executed query', {
                text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                duration: `${duration}ms`,
                rows: result.rowCount
            });
            
            return result;
        } catch (error) {
            logger.error('Database query error:', {
                text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                error: error.message,
                params
            });
            throw error;
        }
    },

    // Get a client from the pool for transactions
    async getClient() {
        try {
            const client = await pool.connect();
            return client;
        } catch (error) {
            logger.error('Error getting database client:', error);
            throw error;
        }
    },

    // Close all connections
    async close() {
        try {
            await pool.end();
            logger.info('Database connections closed');
        } catch (error) {
            logger.error('Error closing database connections:', error);
            throw error;
        }
    }
};

module.exports = database;