const database = require('./connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Database migration script
const migrations = [
    // Create users table
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
    
    `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
    );`,

    // Create releases table
    `CREATE TABLE IF NOT EXISTS releases (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) DEFAULT 'SunFixer & OVM',
        genre VARCHAR(100),
        release_date DATE,
        description TEXT,
        cover_image_url VARCHAR(500),
        audio_url VARCHAR(500),
        soundcloud_url VARCHAR(500),
        spotify_url VARCHAR(500),
        youtube_url VARCHAR(500),
        is_featured BOOLEAN DEFAULT false,
        play_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // Create events table
    `CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        venue VARCHAR(255),
        location VARCHAR(255),
        event_date TIMESTAMP,
        description TEXT,
        status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'past', 'cancelled')),
        ticket_url VARCHAR(500),
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // Create contacts table
    `CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(500),
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // Create newsletter table
    `CREATE TABLE IF NOT EXISTS newsletter (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unsubscribed_at TIMESTAMP
    );`,

    // Create indexes
    `CREATE INDEX IF NOT EXISTS idx_releases_genre ON releases(genre);`,
    `CREATE INDEX IF NOT EXISTS idx_releases_featured ON releases(is_featured);`,
    `CREATE INDEX IF NOT EXISTS idx_releases_date ON releases(release_date);`,
    `CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);`,
    `CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);`,
    `CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter(is_active);`,

    // Create updated_at trigger function
    `CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';`,

    // Create triggers for updated_at
    `DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
            CREATE TRIGGER update_users_updated_at 
                BEFORE UPDATE ON users 
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_releases_updated_at') THEN
            CREATE TRIGGER update_releases_updated_at 
                BEFORE UPDATE ON releases 
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at') THEN
            CREATE TRIGGER update_events_updated_at 
                BEFORE UPDATE ON events 
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END $$;`
];

async function runMigrations() {
    const client = await database.getClient();
    
    try {
        await client.query('BEGIN');
        
        logger.info('Running database migrations...');
        
        for (let i = 0; i < migrations.length; i++) {
            const migration = migrations[i];
            logger.info(`Running migration ${i + 1}/${migrations.length}`);
            
            try {
                await client.query(migration);
                logger.info(`✅ Migration ${i + 1} completed successfully`);
            } catch (error) {
                logger.error(`❌ Migration ${i + 1} failed:`, error.message);
                throw error;
            }
        }
        
        await client.query('COMMIT');
        logger.info('🎉 All migrations completed successfully!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Migration failed, rolling back:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run migrations if called directly
if (require.main === module) {
    runMigrations()
        .then(() => {
            logger.info('Migration process completed');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Migration process failed:', error);
            process.exit(1);
        });
}

module.exports = { runMigrations };