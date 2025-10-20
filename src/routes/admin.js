const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const database = require('../database/connection');
const logger = require('../utils/logger');

// Admin authentication middleware
const requireAdminAuth = (req, res, next) => {
    if (!req.session?.adminUser) {
        return res.redirect('/admin/login');
    }
    next();
};

/* ... existing routes above ... */

// --- Releases: New / Edit / Delete ---

// New Release form
router.get('/releases/new', requireAdminAuth, async (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Release - CORE64 Admin</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body class="container py-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1>New Release</h1>
                <a href="/admin/releases" class="btn btn-secondary">Back</a>
            </div>
            <form method="POST" action="/admin/releases/new">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Title*</label>
                        <input name="title" class="form-control" required />
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Artist*</label>
                        <input name="artist" class="form-control" required />
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Album</label>
                        <input name="album" class="form-control" />
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Genre</label>
                        <input name="genre" class="form-control" />
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Release Date</label>
                        <input type="date" name="release_date" class="form-control" />
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Featured</label>
                        <select name="featured" class="form-select">
                            <option value="false" selected>No</option>
                            <option value="true">Yes</option>
                        </select>
                    </div>
                    <div class="col-12">
                        <label class="form-label">Description</label>
                        <textarea name="description" class="form-control" rows="4"></textarea>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Cover URL</label>
                        <input name="cover_url" class="form-control" />
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Audio URL</label>
                        <input name="audio_url" class="form-control" />
                    </div>
                </div>
                <div class="mt-4">
                    <button class="btn btn-primary">Create</button>
                </div>
            </form>
        </body>
        </html>
    `);
});

// Handle new release
router.post('/releases/new', requireAdminAuth, async (req, res) => {
    try {
        const { title, artist, album, genre, release_date, description, cover_url, audio_url, featured } = req.body;
        if (!title || !artist) {
            return res.status(400).send('<h1>Title and Artist are required</h1>');
        }
        await database.query(`
            INSERT INTO releases (
                title, artist, album, genre, release_date, description,
                cover_url, audio_url, featured, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [title, artist, album, genre, release_date || null, description, cover_url, audio_url, featured === 'true']);
        res.redirect('/admin/releases');
    } catch (error) {
        logger.error('Error creating release:', error);
        res.status(500).send('<h1>Error creating release</h1>');
    }
});

// Edit Release form
router.get('/releases/edit/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database.query('SELECT * FROM releases WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).send('<h1>Release not found</h1>');
        const r = result.rows[0];
        const dateVal = r.release_date ? new Date(r.release_date).toISOString().substring(0,10) : '';
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Edit Release - CORE64 Admin</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body class="container py-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h1>Edit Release</h1>
                    <a href="/admin/releases" class="btn btn-secondary">Back</a>
                </div>
                <form method="POST" action="/admin/releases/edit/${r.id}">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">Title*</label>
                            <input name="title" class="form-control" value="${r.title || ''}" required />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Artist*</label>
                            <input name="artist" class="form-control" value="${r.artist || ''}" required />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Album</label>
                            <input name="album" class="form-control" value="${r.album || ''}" />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Genre</label>
                            <input name="genre" class="form-control" value="${r.genre || ''}" />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Release Date</label>
                            <input type="date" name="release_date" class="form-control" value="${dateVal}" />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Featured</label>
                            <select name="featured" class="form-select">
                                <option value="false" ${!r.featured ? 'selected' : ''}>No</option>
                                <option value="true" ${r.featured ? 'selected' : ''}>Yes</option>
                            </select>
                        </div>
                        <div class="col-12">
                            <label class="form-label">Description</label>
                            <textarea name="description" class="form-control" rows="4">${r.description || ''}</textarea>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Cover URL</label>
                            <input name="cover_url" class="form-control" value="${r.cover_url || ''}" />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Audio URL</label>
                            <input name="audio_url" class="form-control" value="${r.audio_url || ''}" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <button class="btn btn-primary">Save</button>
                    </div>
                </form>
            </body>
            </html>
        `);
    } catch (error) {
        logger.error('Error opening edit form:', error);
        res.status(500).send('<h1>Error opening edit form</h1>');
    }
});

// Handle edit
router.post('/releases/edit/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, artist, album, genre, release_date, description, cover_url, audio_url, featured } = req.body;
        await database.query(`
            UPDATE releases SET
                title = $1,
                artist = $2,
                album = $3,
                genre = $4,
                release_date = $5,
                description = $6,
                cover_url = $7,
                audio_url = $8,
                featured = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
        `, [title, artist, album, genre, release_date || null, description, cover_url, audio_url, featured === 'true', id]);
        res.redirect('/admin/releases');
    } catch (error) {
        logger.error('Error updating release:', error);
        res.status(500).send('<h1>Error updating release</h1>');
    }
});

// Delete release
router.get('/releases/delete/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await database.query('DELETE FROM releases WHERE id = $1', [id]);
        res.redirect('/admin/releases');
    } catch (error) {
        logger.error('Error deleting release:', error);
        res.status(500).send('<h1>Error deleting release</h1>');
    }
});

module.exports = router;
