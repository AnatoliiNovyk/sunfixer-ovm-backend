const express = require('express');
const router = express.Router();
const database = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/releases - Get all releases (public)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, featured, genre } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM releases WHERE 1=1';
        let params = [];
        let paramIndex = 0;
        
        // Filter by featured
        if (featured !== undefined) {
            paramIndex++;
            query += ` AND featured = $${paramIndex}`;
            params.push(featured === 'true');
        }
        
        // Filter by genre
        if (genre) {
            paramIndex++;
            query += ` AND genre ILIKE $${paramIndex}`;
            params.push(`%${genre}%`);
        }
        
        // Order by release date (newest first) and add pagination
        query += ` ORDER BY release_date DESC, created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
        params.push(limit, offset);
        
        const result = await database.query(query, params);
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) FROM releases WHERE 1=1';
        let countParams = [];
        let countParamIndex = 0;
        
        if (featured !== undefined) {
            countParamIndex++;
            countQuery += ` AND featured = $${countParamIndex}`;
            countParams.push(featured === 'true');
        }
        
        if (genre) {
            countParamIndex++;
            countQuery += ` AND genre ILIKE $${countParamIndex}`;
            countParams.push(`%${genre}%`);
        }
        
        const countResult = await database.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        res.json({
            releases: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
        logger.info('Releases fetched successfully', { 
            count: result.rows.length, 
            page, 
            limit,
            featured,
            genre
        });
    } catch (error) {
        logger.error('Error fetching releases:', error);
        res.status(500).json({ 
            error: 'Failed to fetch releases',
            message: error.message 
        });
    }
});

// GET /api/releases/:id - Get specific release (public)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await database.query(
            'SELECT * FROM releases WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Release not found',
                message: `Release with ID ${id} does not exist`
            });
        }
        
        res.json(result.rows[0]);
        
        logger.info('Release fetched successfully', { id });
    } catch (error) {
        logger.error('Error fetching release:', error);
        res.status(500).json({ 
            error: 'Failed to fetch release',
            message: error.message 
        });
    }
});

// POST /api/releases/:id/play - Increment play count (public)
router.post('/:id/play', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await database.query(
            'UPDATE releases SET play_count = play_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Release not found',
                message: `Release with ID ${id} does not exist`
            });
        }
        
        res.json({
            message: 'Play count updated successfully',
            release: result.rows[0]
        });
        
        logger.info('Play count incremented', { 
            id, 
            new_play_count: result.rows[0].play_count 
        });
    } catch (error) {
        logger.error('Error incrementing play count:', error);
        res.status(500).json({ 
            error: 'Failed to increment play count',
            message: error.message 
        });
    }
});

// POST /api/releases - Create new release (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            title,
            artist,
            album,
            genre,
            release_date,
            description,
            cover_url,
            audio_url,
            featured = false
        } = req.body;
        
        // Validate required fields
        if (!title || !artist) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Title and artist are required'
            });
        }
        
        const result = await database.query(`
            INSERT INTO releases (
                title, artist, album, genre, release_date, description, 
                cover_url, audio_url, featured, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `, [title, artist, album, genre, release_date, description, cover_url, audio_url, featured]);
        
        res.status(201).json({
            message: 'Release created successfully',
            release: result.rows[0]
        });
        
        logger.info('Release created successfully', { 
            id: result.rows[0].id, 
            title, 
            artist,
            admin_user: req.user.email
        });
    } catch (error) {
        logger.error('Error creating release:', error);
        res.status(500).json({ 
            error: 'Failed to create release',
            message: error.message 
        });
    }
});

// PUT /api/releases/:id - Update release (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            artist,
            album,
            genre,
            release_date,
            description,
            cover_url,
            audio_url,
            featured
        } = req.body;
        
        // Check if release exists
        const existingRelease = await database.query(
            'SELECT * FROM releases WHERE id = $1',
            [id]
        );
        
        if (existingRelease.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Release not found',
                message: `Release with ID ${id} does not exist`
            });
        }
        
        const result = await database.query(`
            UPDATE releases 
            SET title = COALESCE($1, title),
                artist = COALESCE($2, artist),
                album = COALESCE($3, album),
                genre = COALESCE($4, genre),
                release_date = COALESCE($5, release_date),
                description = COALESCE($6, description),
                cover_url = COALESCE($7, cover_url),
                audio_url = COALESCE($8, audio_url),
                featured = COALESCE($9, featured),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `, [title, artist, album, genre, release_date, description, cover_url, audio_url, featured, id]);
        
        res.json({
            message: 'Release updated successfully',
            release: result.rows[0]
        });
        
        logger.info('Release updated successfully', { 
            id, 
            admin_user: req.user.email
        });
    } catch (error) {
        logger.error('Error updating release:', error);
        res.status(500).json({ 
            error: 'Failed to update release',
            message: error.message 
        });
    }
});

// DELETE /api/releases/:id - Delete release (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await database.query(
            'DELETE FROM releases WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Release not found',
                message: `Release with ID ${id} does not exist`
            });
        }
        
        res.json({
            message: 'Release deleted successfully',
            release: result.rows[0]
        });
        
        logger.info('Release deleted successfully', { 
            id, 
            title: result.rows[0].title,
            admin_user: req.user.email
        });
    } catch (error) {
        logger.error('Error deleting release:', error);
        res.status(500).json({ 
            error: 'Failed to delete release',
            message: error.message 
        });
    }
});

module.exports = router;