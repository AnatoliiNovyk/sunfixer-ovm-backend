const database = require('./connection');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Sample data for seeding
const sampleData = {
    users: [
        {
            email: 'admin@core64records.com',
            password: 'admin123!',
            role: 'admin',
            name: 'CORE64 Admin'
        },
        {
            email: 'sunfixer@core64records.com',
            password: 'sunfixer123!',
            role: 'admin',
            name: 'SunFixer'
        }
    ],
    
    releases: [
        {
            title: 'U99 - Ace of Aces',
            artist: 'SunFixer & OVM',
            genre: 'Neurofunk',
            release_date: '2025-01-15',
            description: 'Dark neurofunk masterpiece with intricate basslines and futuristic sound design.',
            is_featured: true,
            play_count: 1250
        },
        {
            title: 'Electric Mirage',
            artist: 'SunFixer & OVM',
            genre: 'Dark Drum & Bass',
            release_date: '2025-02-28',
            description: 'Heavy, aggressive drum and bass with dark atmospheres and powerful basslines.',
            is_featured: true,
            play_count: 980
        },
        {
            title: 'Dystopian Orbit',
            artist: 'SunFixer & OVM',
            genre: 'Breakbeat',
            release_date: '2025-03-10',
            description: 'Electronic music utilizing chopped and manipulated drum breaks.',
            is_featured: false,
            play_count: 750
        },
        {
            title: 'U98 - The Last Dive',
            artist: 'SunFixer & OVM',
            genre: 'Jungle',
            release_date: '2025-04-05',
            description: 'Fast breakbeats with reggae and dancehall influences.',
            is_featured: false,
            play_count: 650
        },
        {
            title: 'Neon Velocity Dreams',
            artist: 'SunFixer & OVM',
            genre: 'JumpUP',
            release_date: '2025-05-20',
            description: 'High-energy drum and bass with bouncing basslines.',
            is_featured: true,
            play_count: 1100
        },
        {
            title: 'The Void',
            artist: 'SunFixer & OVM',
            genre: 'Dubstep',
            release_date: '2025-06-15',
            description: 'Electronic dance music with syncopated drums and prominent basslines.',
            is_featured: false,
            play_count: 420
        }
    ],
    
    events: [
        {
            title: 'Dark Drum & Bass Night',
            venue: 'Kultura Zvuku',
            location: 'Kiev, Ukraine',
            event_date: '2025-11-25 22:00:00',
            description: 'An evening of dark drum and bass featuring SunFixer & OVM live set.',
            status: 'upcoming'
        },
        {
            title: 'Neurofunk Session',
            venue: 'Keller Club',
            location: 'Kiev, Ukraine',
            event_date: '2025-12-15 23:00:00',
            description: 'Underground neurofunk session with latest releases from CORE64 Records.',
            status: 'upcoming'
        },
        {
            title: 'CORE64 Label Showcase',
            venue: '20ft Radio',
            location: 'Kiev, Ukraine',
            event_date: '2025-10-01 21:00:00',
            description: 'Label showcase featuring multiple artists from CORE64 Records.',
            status: 'past'
        }
    ]
};

async function seedDatabase() {
    const client = await database.getClient();
    
    try {
        await client.query('BEGIN');
        
        logger.info('Starting database seeding...');
        
        // Seed users
        logger.info('Seeding users...');
        for (const userData of sampleData.users) {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            
            await client.query(`
                INSERT INTO users (email, password_hash, role, name)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (email) DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    name = EXCLUDED.name
            `, [userData.email, hashedPassword, userData.role, userData.name]);
        }
        logger.info(`✅ Seeded ${sampleData.users.length} users`);
        
        // Seed releases
        logger.info('Seeding releases...');
        for (const release of sampleData.releases) {
            await client.query(`
                INSERT INTO releases (title, artist, genre, release_date, description, is_featured, play_count)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT DO NOTHING
            `, [
                release.title,
                release.artist,
                release.genre,
                release.release_date,
                release.description,
                release.is_featured,
                release.play_count
            ]);
        }
        logger.info(`✅ Seeded ${sampleData.releases.length} releases`);
        
        // Seed events
        logger.info('Seeding events...');
        for (const event of sampleData.events) {
            await client.query(`
                INSERT INTO events (title, venue, location, event_date, description, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
            `, [
                event.title,
                event.venue,
                event.location,
                event.event_date,
                event.description,
                event.status
            ]);
        }
        logger.info(`✅ Seeded ${sampleData.events.length} events`);
        
        await client.query('COMMIT');
        logger.info('🎉 Database seeding completed successfully!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Seeding failed, rolling back:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run seeding if called directly
if (require.main === module) {
    seedDatabase()
        .then(() => {
            logger.info('Seeding process completed');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Seeding process failed:', error);
            process.exit(1);
        });
}

module.exports = { seedDatabase };