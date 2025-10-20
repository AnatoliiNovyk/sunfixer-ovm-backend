#!/usr/bin/env node

// Generate security secrets for SunFixer & OVM Backend
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 SunFixer & OVM Security Secrets Generator');
console.log('=============================================\n');

// Generate secrets
const secrets = {
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'), 
    ADMIN_COOKIE_SECRET: crypto.randomBytes(32).toString('hex'),
    ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString('hex')
};

console.log('Generated secrets:');
console.log('');
Object.entries(secrets).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
});

console.log('');

// Check if .env exists and offer to update
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (fs.existsSync(envPath)) {
    console.log('📝 .env file found. Update it with the secrets above.');
    
    // Auto-update if requested
    const args = process.argv.slice(2);
    if (args.includes('--update') || args.includes('-u')) {
        try {
            let envContent = fs.readFileSync(envPath, 'utf8');
            
            Object.entries(secrets).forEach(([key, value]) => {
                const regex = new RegExp(`${key}=.*`, 'g');
                envContent = envContent.replace(regex, `${key}=${value}`);
            });
            
            fs.writeFileSync(envPath, envContent);
            console.log('✅ Updated .env file with new secrets');
        } catch (error) {
            console.error('❌ Failed to update .env file:', error.message);
            process.exit(1);
        }
    }
} else if (fs.existsSync(envExamplePath)) {
    console.log('📝 Copy .env.example to .env and add the secrets above');
} else {
    console.log('📝 Create a .env file and add the secrets above');
}

console.log('');
console.log('💡 Usage: node scripts/generate-secrets.js [--update]');
console.log('   --update, -u    Automatically update .env file');
console.log('');
console.log('🎵 Ready to secure your SunFixer & OVM backend!');
