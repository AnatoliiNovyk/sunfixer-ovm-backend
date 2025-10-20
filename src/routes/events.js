const express = require('express');
const { body, validationResult } = require('express-validator');

const database = require('../database/connection');
const logger = require('../utils/logger');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const eventValidation = [
    body('title').trim().isLength({ min: 1, max: 255 }),
    body('venue').optional().trim().isLength({ max: 255 }),
    body('location').optional().trim().isLength({ max: 255 }),
    body('event_date').isISO8601(),
    body('description').optional().trim(),
    body('status').optional().isIn(['upcoming', 'past', 'cancelled']),
    body('ticket_url').optional().isURL(),
    body('image_url').optional().isURL()
];

// GET /api/events - Get all events
router.get('/', async (req, res) => {
    try {
        const { 
            limit = 20, 
            offset = 0, 
            status = 'upcoming',
            sort = 'event_date',
            order = 'ASC'
        } = req.query;
        
        let query = 'SELECT * FROM events WHERE 1=1';
        const params = [];
        let paramCount = 0;
        
        // Filter by status
        if (status && status !== 'all') {
            paramCount++;
            query += ` AND status = $${paramCount}`;
            params.push(status);
        }
        
        // Add ordering
        const validSortFields = ['event_date', 'title', 'created_at'];
        const sortField = validSortFields.includes(sort) ? sort : 'event_date';
        const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        
        query += ` ORDER BY ${sortField} ${sortOrder}`;
        
        // Add pagination
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(parseInt(limit));
        
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(parseInt(offset));
        
        const result = await database.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM events WHERE 1=1';
        const countParams = [];
        let countParamCount = 0;
        
        if (status && status !== 'all') {
            countParamCount++;
            countQuery += ` AND status = $${countParamCount}`;
            countParams.push(status);
        }
        
        const countResult = await database.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);
        
        res.json({
            events: result.rows,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalCount / limit)
            }
        });
        
    } catch (error) {
        logger.error('Get events error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;