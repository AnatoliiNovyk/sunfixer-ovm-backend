const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const database = require('../database/connection');
const logger = require('../utils/logger');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for contact form
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 requests per hour
    message: { error: 'Too many contact requests. Please try again later.' }
});

// Validation rules
const contactValidation = [
    body('name').trim().isLength({ min: 2, max: 255 }),
    body('email').isEmail().normalizeEmail(),
    body('subject').optional().trim().isLength({ max: 500 }),
    body('message').trim().isLength({ min: 10, max: 5000 })
];

// POST /api/contact - Submit contact form
router.post('/', contactLimiter, contactValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }
        
        const { name, email, subject, message } = req.body;
        
        const result = await database.query(`
            INSERT INTO contacts (name, email, subject, message)
            VALUES ($1, $2, $3, $4)
            RETURNING id, created_at
        `, [name, email, subject, message]);
        
        logger.info(`Contact form submitted: ${email} - ${subject || 'No subject'}`);
        
        res.status(201).json({
            message: 'Contact form submitted successfully. We will get back to you soon!',
            contactId: result.rows[0].id
        });
        
    } catch (error) {
        logger.error('Contact form error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;