const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const database = require('../database/connection');
const logger = require('../utils/logger');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for newsletter operations
const newsletterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 newsletter operations per hour
    message: { error: 'Too many newsletter requests. Please try again later.' }
});

// Validation rules
const subscribeValidation = [
    body('email').isEmail().normalizeEmail()
];

// POST /api/newsletter/subscribe - Subscribe to newsletter
router.post('/subscribe', newsletterLimiter, subscribeValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }
        
        const { email } = req.body;
        
        try {
            const result = await database.query(`
                INSERT INTO newsletter (email, is_active, subscribed_at)
                VALUES ($1, true, CURRENT_TIMESTAMP)
                RETURNING id, email, subscribed_at
            `, [email]);
            
            logger.info(`Newsletter subscription: ${email}`);
            
            res.status(201).json({
                message: 'Successfully subscribed to newsletter!',
                subscription: result.rows[0]
            });
            
        } catch (error) {
            // Handle duplicate email
            if (error.constraint === 'newsletter_email_key') {
                return res.status(409).json({ error: 'Email already subscribed to newsletter' });
            }
            
            throw error;
        }
        
    } catch (error) {
        logger.error('Newsletter subscribe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;