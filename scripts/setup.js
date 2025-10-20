#!/usr/bin/env node

// Interactive setup for SunFixer & OVM Backend
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => {
        rl.question(question, resolve);
    });
}

function askPassword(question) {
    return new Promise(resolve => {
        process.stdout.write(question);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        let password = '';
        const onData = (char) => {
            switch (char) {
                case '\n':
                case '\r':
                case '\u0004': // Ctrl+D
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdin.removeListener('data', onData);
                    console.log('');
                    resolve(password);
                    break;
                case '\u0003': // Ctrl+C
                    process.exit(1);
                    break;
                case '\u007f': // Backspace
                case '\u0008': // Backspace
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                    break;
                default:
                    password += char;
                    process.stdout.write('*');
                    break;
            }
        };
        
        process.stdin.on('data', onData);
    });
}

function runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { 
            stdio: 'inherit',
            shell: process.platform === 'win32'
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });
    });
}

async function main() {
    console.log('🎵 SunFixer & OVM Backend Interactive Setup');
    console.log('==========================================\n');
    
    // Check if .env exists
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envPath)) {
        console.log('📝 Setting up .env file...');
        if (fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            console.log('✅ Copied .env.example to .env');
        } else {
            console.log('⚠️  .env.example not found, creating basic .env');
            const basicEnv = `# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sunfixer_ovm
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=placeholder
JWT_REFRESH_SECRET=placeholder

# Admin Panel Configuration  
ADMIN_COOKIE_SECRET=placeholder
ADMIN_SESSION_SECRET=placeholder

# Optional
SENTRY_DSN=
LOG_LEVEL=info
`;
            fs.writeFileSync(envPath, basicEnv);
        }
    }
    
    // Generate secrets
    console.log('\n🔐 Generating security secrets...');
    const secrets = {
        JWT_SECRET: crypto.randomBytes(32).toString('hex'),
        JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
        ADMIN_COOKIE_SECRET: crypto.randomBytes(32).toString('hex'),
        ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString('hex')
    };
    
    let envContent = fs.readFileSync(envPath, 'utf8');
    Object.entries(secrets).forEach(([key, value]) => {
        const regex = new RegExp(`${key}=.*`, 'g');
        envContent = envContent.replace(regex, `${key}=${value}`);
    });
    
    // Ask for database password
    console.log('\n🗄️  Database Configuration:');
    const dbPassword = await askPassword('Enter your PostgreSQL password for user "postgres": ');
    envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${dbPassword}`);
    
    // Write updated .env
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file');
    
    // Ask to create database
    const createDb = await ask('\nCreate database "sunfixer_ovm"? (Y/n): ');
    if (createDb.toLowerCase() !== 'n') {
        try {
            console.log('🗄️  Creating database...');
            await runCommand('createdb', ['-U', 'postgres', 'sunfixer_ovm']);
            console.log('✅ Database created');
        } catch (error) {
            console.log('⚠️  Could not create database automatically. Please create it manually.');
        }
    }
    
    // Run migrations
    try {
        console.log('\n📊 Running migrations...');
        await runCommand('npm', ['run', 'db:migrate']);
        console.log('✅ Migrations completed');
        
        console.log('\n🌱 Seeding database...');
        await runCommand('npm', ['run', 'db:seed']);
        console.log('✅ Database seeded');
    } catch (error) {
        console.log('❌ Database setup failed. Check your configuration and try again.');
        rl.close();
        process.exit(1);
    }
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('');
    console.log('🚀 Start the server: npm run dev');
    console.log('🌐 Admin Panel: http://localhost:3000/admin');
    console.log('📧 Admin Email: admin@core64records.com');
    console.log('🔑 Admin Password: admin123!');
    console.log('');
    console.log('🎵 Ready to rock with SunFixer & OVM!');
    
    rl.close();
}

main().catch(error => {
    console.error('❌ Setup failed:', error.message);
    rl.close();
    process.exit(1);
});
