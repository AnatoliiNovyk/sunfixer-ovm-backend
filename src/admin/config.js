const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');

const database = require('../database/connection');
const logger = require('../utils/logger');

// Use official AdminJS SQL adapter instead of custom resource
const { Database, Resource } = require('@adminjs/sql');
AdminJS.registerAdapter({ Database, Resource });

// Authentication function
const authenticate = async (email, password) => {
    try {
        const result = await database.query(
            `SELECT * FROM users WHERE email = $1 AND role = 'admin'`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (isValid) {
            await database.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );
            
            logger.info(`Admin login: ${email}`);
            
            return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            };
        }
        
        return null;
    } catch (error) {
        logger.error('Admin authentication error:', error);
        return null;
    }
};

// Setup function
const setupAdmin = (app) => {
    // Define database models/tables for SQL adapter
    const resources = [
        { resource: { model: 'users', schema: 'public' }, options: { navigation: 'Core', id: 'users', name: 'Users' } },
        { resource: { model: 'releases', schema: 'public' }, options: { navigation: 'Core', id: 'releases', name: 'Releases' } },
        { resource: { model: 'events', schema: 'public' }, options: { navigation: 'Core', id: 'events', name: 'Events' } },
        { resource: { model: 'contacts', schema: 'public' }, options: { navigation: 'Core', id: 'contacts', name: 'Contacts' } },
        { resource: { model: 'newsletter', schema: 'public' }, options: { navigation: 'Core', id: 'newsletter', name: 'Newsletter' } }
    ];

    // AdminJS configuration
    const adminJs = new AdminJS({
        resources,
        branding: {
            companyName: 'CORE64 Records',
            withMadeWithLove: false
        },
        rootPath: '/admin'
    });

    // Build router
    const router = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
        authenticate,
        cookieName: 'adminjs',
        cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'session-secret-change-this'
    });

    app.use(adminJs.options.rootPath, router);
    
    logger.info(`Admin panel available at ${adminJs.options.rootPath}`);
    return adminJs;
};

module.exports = { setupAdmin };