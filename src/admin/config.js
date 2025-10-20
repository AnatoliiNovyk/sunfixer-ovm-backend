const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');

const database = require('../database/connection');
const logger = require('../utils/logger');

// Create a custom resource adapter for PostgreSQL
class PostgreSQLResource {
    constructor(model) {
        this.model = model;
    }

    static isAdapterFor(model) {
        return typeof model === 'object' && model.table;
    }

    async find(filter, { limit = 20, offset = 0, sort = {} } = {}) {
        try {
            const { table } = this.model;
            let query = `SELECT * FROM ${table}`;
            let params = [];
            let paramIndex = 0;

            // Apply filters
            const whereConditions = [];
            if (filter && Object.keys(filter).length > 0) {
                for (const [key, value] of Object.entries(filter)) {
                    if (value !== undefined && value !== null && value !== '') {
                        paramIndex++;
                        if (typeof value === 'string' && value.includes('*')) {
                            whereConditions.push(`${key} ILIKE $${paramIndex}`);
                            params.push(value.replace(/\*/g, '%'));
                        } else {
                            whereConditions.push(`${key} = $${paramIndex}`);
                            params.push(value);
                        }
                    }
                }
            }

            if (whereConditions.length > 0) {
                query += ` WHERE ${whereConditions.join(' AND ')}`;
            }

            // Apply sorting
            if (sort && sort.sortBy) {
                const direction = sort.direction === 'asc' ? 'ASC' : 'DESC';
                query += ` ORDER BY ${sort.sortBy} ${direction}`;
            }

            // Apply pagination
            query += ` LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
            params.push(limit, offset);

            const result = await database.query(query, params);
            return result.rows.map(row => ({ params: row, id: row.id }));
        } catch (error) {
            logger.error(`Error finding records in ${this.model.table}:`, error);
            return [];
        }
    }

    async findOne(id) {
        try {
            const { table } = this.model;
            const result = await database.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
            return result.rows[0] ? { params: result.rows[0], id: result.rows[0].id } : null;
        } catch (error) {
            logger.error(`Error finding record ${id} in ${this.model.table}:`, error);
            return null;
        }
    }

    async count(filter) {
        try {
            const { table } = this.model;
            let query = `SELECT COUNT(*) FROM ${table}`;
            let params = [];
            let paramIndex = 0;

            if (filter && Object.keys(filter).length > 0) {
                const whereConditions = [];
                for (const [key, value] of Object.entries(filter)) {
                    if (value !== undefined && value !== null && value !== '') {
                        paramIndex++;
                        whereConditions.push(`${key} = $${paramIndex}`);
                        params.push(value);
                    }
                }
                if (whereConditions.length > 0) {
                    query += ` WHERE ${whereConditions.join(' AND ')}`;
                }
            }

            const result = await database.query(query, params);
            return parseInt(result.rows[0].count);
        } catch (error) {
            logger.error(`Error counting records in ${this.model.table}:`, error);
            return 0;
        }
    }

    async create(params) {
        try {
            const { table } = this.model;
            const fields = Object.keys(params).filter(key => key !== 'id');
            const values = fields.map(field => params[field]);
            const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
            
            const query = `
                INSERT INTO ${table} (${fields.join(', ')})
                VALUES (${placeholders})
                RETURNING *
            `;
            
            const result = await database.query(query, values);
            const record = result.rows[0];
            return { params: record, id: record.id };
        } catch (error) {
            logger.error(`Error creating record in ${this.model.table}:`, error);
            throw error;
        }
    }

    async update(id, params) {
        try {
            const { table } = this.model;
            const fields = Object.keys(params).filter(key => key !== 'id');
            const values = fields.map(field => params[field]);
            const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
            
            const query = `
                UPDATE ${table}
                SET ${setClause}
                WHERE id = $${values.length + 1}
                RETURNING *
            `;
            
            const result = await database.query(query, [...values, id]);
            const record = result.rows[0];
            return record ? { params: record, id: record.id } : null;
        } catch (error) {
            logger.error(`Error updating record ${id} in ${this.model.table}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const { table } = this.model;
            await database.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
            return { params: {}, id };
        } catch (error) {
            logger.error(`Error deleting record ${id} from ${this.model.table}:`, error);
            throw error;
        }
    }
}

// Register the adapter
AdminJS.registerAdapter({
    Resource: PostgreSQLResource,
    Database: class PostgreSQLDatabase {
        constructor(models) {
            this.models = models;
        }
        
        resources() {
            return this.models.map(model => new PostgreSQLResource(model));
        }
    }
});

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
    // Define database models/tables
    const models = [
        { table: 'users', name: 'Users' },
        { table: 'releases', name: 'Releases' },
        { table: 'events', name: 'Events' },
        { table: 'contacts', name: 'Contacts' },
        { table: 'newsletter', name: 'Newsletter' }
    ];

    // AdminJS configuration
    const adminJs = new AdminJS({
        resources: models.map(model => ({
            resource: model,
            options: {
                id: model.table,
                name: model.name,
                navigation: { name: model.name, icon: 'Database' }
            }
        })),
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