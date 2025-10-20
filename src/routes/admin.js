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

// GET /admin/login - Login page
router.get('/login', (req, res) => {
    if (req.session?.adminUser) {
        return res.redirect('/admin/dashboard');
    }
    
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CORE64 Admin - Login</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            <style>
                body { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                }
                .login-card {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 15px;
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                }
                .brand-title {
                    color: #667eea;
                    font-weight: bold;
                    margin-bottom: 30px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-6 col-lg-4">
                        <div class="login-card p-4">
                            <div class="text-center">
                                <i class="fas fa-music fa-3x mb-3" style="color: #667eea;"></i>
                                <h2 class="brand-title">CORE64 Records</h2>
                                <h4 class="mb-4">Admin Panel</h4>
                            </div>
                            
                            ${req.session?.error ? `<div class="alert alert-danger">${req.session.error}</div>` : ''}
                            
                            <form method="POST" action="/admin/login">
                                <div class="mb-3">
                                    <label for="email" class="form-label">
                                        <i class="fas fa-envelope me-2"></i>Email
                                    </label>
                                    <input type="email" class="form-control" id="email" name="email" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="password" class="form-label">
                                        <i class="fas fa-lock me-2"></i>Password
                                    </label>
                                    <input type="password" class="form-control" id="password" name="password" required>
                                </div>
                                
                                <button type="submit" class="btn btn-primary w-100 py-2">
                                    <i class="fas fa-sign-in-alt me-2"></i>Login
                                </button>
                            </form>
                            
                            <div class="text-center mt-4">
                                <small class="text-muted">
                                    Default: admin@core64records.com / admin123!
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
    delete req.session.error;
});

// POST /admin/login - Process login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            req.session.error = 'Email and password are required';
            return res.redirect('/admin/login');
        }
        
        const result = await database.query(
            'SELECT * FROM users WHERE email = $1 AND role = $2',
            [email, 'admin']
        );
        
        if (result.rows.length === 0) {
            req.session.error = 'Invalid credentials';
            return res.redirect('/admin/login');
        }
        
        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            req.session.error = 'Invalid credentials';
            return res.redirect('/admin/login');
        }
        
        // Update last login
        await database.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        
        req.session.adminUser = {
            id: user.id,
            email: user.email,
            name: user.name
        };
        
        logger.info('Admin logged in successfully', { email });
        res.redirect('/admin/dashboard');
    } catch (error) {
        logger.error('Admin login error:', error);
        req.session.error = 'Login failed. Please try again.';
        res.redirect('/admin/login');
    }
});

// GET /admin/logout - Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// GET /admin - Redirect to dashboard
router.get('/', requireAdminAuth, (req, res) => {
    res.redirect('/admin/dashboard');
});

// GET /admin/dashboard - Main dashboard
router.get('/dashboard', requireAdminAuth, async (req, res) => {
    try {
        // Get statistics with safe NULL handling
        const stats = await Promise.all([
            database.query('SELECT COUNT(*) as count FROM releases'),
            database.query('SELECT COUNT(*) as count FROM events'),
            database.query('SELECT COUNT(*) as count FROM contacts WHERE status = $1', ['new']),
            database.query('SELECT COUNT(*) as count FROM newsletter'),
            database.query('SELECT COALESCE(SUM(play_count), 0) as total FROM releases'),
            database.query('SELECT * FROM releases WHERE featured = true ORDER BY created_at DESC LIMIT 3')
        ]);
        
        const [releases, events, newContacts, subscribers, totalPlays, featuredReleases] = stats;
        
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CORE64 Admin Dashboard</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
                <style>
                    .sidebar {
                        background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        color: white;
                    }
                    .sidebar .nav-link {
                        color: rgba(255, 255, 255, 0.8);
                        transition: all 0.3s;
                    }
                    .sidebar .nav-link:hover, .sidebar .nav-link.active {
                        color: white;
                        background: rgba(255, 255, 255, 0.1);
                    }
                    .stats-card {
                        background: white;
                        border-radius: 10px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        transition: transform 0.2s;
                    }
                    .stats-card:hover {
                        transform: translateY(-2px);
                    }
                    .main-content {
                        background: #f8f9fa;
                        min-height: 100vh;
                    }
                </style>
            </head>
            <body>
                <div class="container-fluid">
                    <div class="row">
                        <!-- Sidebar -->
                        <div class="col-md-3 col-lg-2 sidebar p-0">
                            <div class="p-3">
                                <h4 class="text-center">
                                    <i class="fas fa-music me-2"></i>CORE64
                                </h4>
                                <hr class="text-white">
                                <nav class="nav flex-column">
                                    <a class="nav-link active" href="/admin/dashboard">
                                        <i class="fas fa-home me-2"></i>Dashboard
                                    </a>
                                    <a class="nav-link" href="/admin/releases">
                                        <i class="fas fa-compact-disc me-2"></i>Releases
                                    </a>
                                    <a class="nav-link" href="/admin/events">
                                        <i class="fas fa-calendar me-2"></i>Events
                                    </a>
                                    <a class="nav-link" href="/admin/contacts">
                                        <i class="fas fa-envelope me-2"></i>Contacts
                                    </a>
                                    <a class="nav-link" href="/admin/newsletter">
                                        <i class="fas fa-users me-2"></i>Newsletter
                                    </a>
                                    <hr class="text-white">
                                    <a class="nav-link" href="/admin/logout">
                                        <i class="fas fa-sign-out-alt me-2"></i>Logout
                                    </a>
                                </nav>
                                <div class="mt-3 text-center">
                                    <small>Welcome, ${req.session.adminUser.name || req.session.adminUser.email}</small>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Main Content -->
                        <div class="col-md-9 col-lg-10 main-content p-4">
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                <h1>Dashboard</h1>
                                <span class="badge bg-success fs-6">Online</span>
                            </div>
                            
                            <!-- Stats Cards -->
                            <div class="row mb-4">
                                <div class="col-md-3 mb-3">
                                    <div class="stats-card p-3">
                                        <div class="d-flex align-items-center">
                                            <div class="me-3">
                                                <i class="fas fa-compact-disc fa-2x text-primary"></i>
                                            </div>
                                            <div>
                                                <h3 class="mb-0">${releases.rows[0].count}</h3>
                                                <small class="text-muted">Releases</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="stats-card p-3">
                                        <div class="d-flex align-items-center">
                                            <div class="me-3">
                                                <i class="fas fa-calendar fa-2x text-success"></i>
                                            </div>
                                            <div>
                                                <h3 class="mb-0">${events.rows[0].count}</h3>
                                                <small class="text-muted">Events</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="stats-card p-3">
                                        <div class="d-flex align-items-center">
                                            <div class="me-3">
                                                <i class="fas fa-envelope fa-2x text-warning"></i>
                                            </div>
                                            <div>
                                                <h3 class="mb-0">${newContacts.rows[0].count}</h3>
                                                <small class="text-muted">New Messages</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="stats-card p-3">
                                        <div class="d-flex align-items-center">
                                            <div class="me-3">
                                                <i class="fas fa-users fa-2x text-info"></i>
                                            </div>
                                            <div>
                                                <h3 class="mb-0">${subscribers.rows[0].count}</h3>
                                                <small class="text-muted">Subscribers</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Total Plays -->
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <div class="stats-card p-3">
                                        <h5><i class="fas fa-play me-2"></i>Total Plays</h5>
                                        <h2 class="text-primary">${totalPlays.rows[0].total || 0}</h2>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="stats-card p-3">
                                        <h5><i class="fas fa-star me-2"></i>Featured Releases</h5>
                                        ${featuredReleases.rows.length > 0 ? 
                                            featuredReleases.rows.map(release => 
                                                `<div class="mb-2">
                                                    <strong>${release.title}</strong> by ${release.artist}<br>
                                                    <small class="text-muted">${release.play_count || 0} plays</small>
                                                </div>`
                                            ).join('') 
                                            : '<p class="text-muted">No featured releases</p>'
                                        }
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Quick Actions -->
                            <div class="row">
                                <div class="col-12">
                                    <div class="stats-card p-3">
                                        <h5><i class="fas fa-bolt me-2"></i>Quick Actions</h5>
                                        <div class="d-flex gap-2 flex-wrap">
                                            <a href="/admin/releases/new" class="btn btn-primary">
                                                <i class="fas fa-plus me-1"></i>New Release
                                            </a>
                                            <a href="/admin/events/new" class="btn btn-success">
                                                <i class="fas fa-calendar-plus me-1"></i>New Event
                                            </a>
                                            <a href="/admin/contacts" class="btn btn-warning">
                                                <i class="fas fa-envelope me-1"></i>Check Messages
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
            </body>
            </html>
        `);
    } catch (error) {
        logger.error('Error loading dashboard:', error);
        res.status(500).send(`
            <h1>Error loading dashboard</h1>
            <p>Details: ${error.message}</p>
            <p><a href="/admin/releases">Go to Releases</a></p>
        `);
    }
});

// Simple releases management page
router.get('/releases', requireAdminAuth, async (req, res) => {
    try {
        const result = await database.query('SELECT * FROM releases ORDER BY created_at DESC');
        
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Releases - CORE64 Admin</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-4">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1><i class="fas fa-compact-disc me-2"></i>Releases</h1>
                        <div>
                            <a href="/admin/dashboard" class="btn btn-secondary me-2">
                                <i class="fas fa-arrow-left me-1"></i>Back to Dashboard
                            </a>
                            <a href="/admin/releases/new" class="btn btn-primary">
                                <i class="fas fa-plus me-1"></i>New Release
                            </a>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Artist</th>
                                    <th>Genre</th>
                                    <th>Release Date</th>
                                    <th>Plays</th>
                                    <th>Featured</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${result.rows.map(release => `
                                    <tr>
                                        <td><strong>${release.title}</strong></td>
                                        <td>${release.artist}</td>
                                        <td><span class="badge bg-secondary">${release.genre || 'N/A'}</span></td>
                                        <td>${release.release_date ? new Date(release.release_date).toLocaleDateString() : 'N/A'}</td>
                                        <td>${release.play_count || 0}</td>
                                        <td>${release.featured ? '<span class="badge bg-warning">Yes</span>' : 'No'}</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <a href="/admin/releases/edit/${release.id}" class="btn btn-outline-primary">
                                                    <i class="fas fa-edit"></i>
                                                </a>
                                                <a href="/admin/releases/delete/${release.id}" class="btn btn-outline-danger" 
                                                   onclick="return confirm('Are you sure you want to delete this release?')">
                                                    <i class="fas fa-trash"></i>
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${result.rows.length === 0 ? '<div class="text-center py-4"><p class="text-muted">No releases found</p></div>' : ''}
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        logger.error('Error loading releases:', error);
        res.status(500).send('<h1>Error loading releases</h1>');
    }
});

// Events management page
router.get('/events', requireAdminAuth, async (req, res) => {
    try {
        const result = await database.query('SELECT * FROM events ORDER BY event_date DESC');
        
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Events - CORE64 Admin</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-4">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1><i class="fas fa-calendar me-2"></i>Events</h1>
                        <div>
                            <a href="/admin/dashboard" class="btn btn-secondary me-2">
                                <i class="fas fa-arrow-left me-1"></i>Back to Dashboard
                            </a>
                            <a href="/admin/events/new" class="btn btn-primary">
                                <i class="fas fa-plus me-1"></i>New Event
                            </a>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Location</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${result.rows.map(event => `
                                    <tr>
                                        <td><strong>${event.title}</strong></td>
                                        <td>${event.location || 'N/A'}</td>
                                        <td>${event.event_date ? new Date(event.event_date).toLocaleDateString() : 'N/A'}</td>
                                        <td>${event.event_time || 'N/A'}</td>
                                        <td><span class="badge bg-info">${event.status || 'scheduled'}</span></td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <a href="/admin/events/edit/${event.id}" class="btn btn-outline-primary">
                                                    <i class="fas fa-edit"></i>
                                                </a>
                                                <a href="/admin/events/delete/${event.id}" class="btn btn-outline-danger" 
                                                   onclick="return confirm('Are you sure you want to delete this event?')">
                                                    <i class="fas fa-trash"></i>
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${result.rows.length === 0 ? '<div class="text-center py-4"><p class="text-muted">No events found</p></div>' : ''}
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        logger.error('Error loading events:', error);
        res.status(500).send('<h1>Error loading events</h1>');
    }
});

// Contacts management page
router.get('/contacts', requireAdminAuth, async (req, res) => {
    try {
        const result = await database.query('SELECT * FROM contacts ORDER BY created_at DESC');
        
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Contacts - CORE64 Admin</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-4">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1><i class="fas fa-envelope me-2"></i>Contact Messages</h1>
                        <a href="/admin/dashboard" class="btn btn-secondary">
                            <i class="fas fa-arrow-left me-1"></i>Back to Dashboard
                        </a>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Subject</th>
                                    <th>Message</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${result.rows.map(contact => `
                                    <tr class="${contact.status === 'new' ? 'table-warning' : ''}">
                                        <td><strong>${contact.name}</strong></td>
                                        <td>${contact.email}</td>
                                        <td>${contact.subject || 'N/A'}</td>
                                        <td>${contact.message.length > 50 ? contact.message.substring(0, 50) + '...' : contact.message}</td>
                                        <td>
                                            <span class="badge ${contact.status === 'new' ? 'bg-warning' : contact.status === 'replied' ? 'bg-success' : 'bg-secondary'}">
                                                ${contact.status || 'new'}
                                            </span>
                                        </td>
                                        <td>${contact.created_at ? new Date(contact.created_at).toLocaleDateString() : 'N/A'}</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <a href="/admin/contacts/view/${contact.id}" class="btn btn-outline-primary">
                                                    <i class="fas fa-eye"></i>
                                                </a>
                                                <a href="/admin/contacts/delete/${contact.id}" class="btn btn-outline-danger" 
                                                   onclick="return confirm('Are you sure you want to delete this message?')">
                                                    <i class="fas fa-trash"></i>
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${result.rows.length === 0 ? '<div class="text-center py-4"><p class="text-muted">No contact messages found</p></div>' : ''}
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        logger.error('Error loading contacts:', error);
        res.status(500).send('<h1>Error loading contacts</h1>');
    }
});

// Newsletter management page
router.get('/newsletter', requireAdminAuth, async (req, res) => {
    try {
        const result = await database.query('SELECT * FROM newsletter ORDER BY created_at DESC');
        
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Newsletter - CORE64 Admin</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-4">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1><i class="fas fa-users me-2"></i>Newsletter Subscribers</h1>
                        <a href="/admin/dashboard" class="btn btn-secondary">
                            <i class="fas fa-arrow-left me-1"></i>Back to Dashboard
                        </a>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Subscribed Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${result.rows.map(subscriber => `
                                    <tr>
                                        <td><strong>${subscriber.email}</strong></td>
                                        <td>
                                            <span class="badge ${subscriber.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                                                ${subscriber.status || 'active'}
                                            </span>
                                        </td>
                                        <td>${subscriber.created_at ? new Date(subscriber.created_at).toLocaleDateString() : 'N/A'}</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <a href="/admin/newsletter/delete/${subscriber.id}" class="btn btn-outline-danger" 
                                                   onclick="return confirm('Are you sure you want to remove this subscriber?')">
                                                    <i class="fas fa-trash"></i>
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${result.rows.length === 0 ? '<div class="text-center py-4"><p class="text-muted">No newsletter subscribers found</p></div>' : ''}
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        logger.error('Error loading newsletter:', error);
        res.status(500).send('<h1>Error loading newsletter</h1>');
    }
});

module.exports = router;