#!/usr/bin/env node

// Check .env configuration for SunFixer & OVM Backend
const fs = require('fs');
const path = require('path');

console.log('🔍 SunFixer & OVM Environment Check');
console.log('===================================\n');

const envPath = path.join(process.cwd(), '.env');
const requiredVars = [
    'DB_HOST',
    'DB_PORT', 
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ADMIN_COOKIE_SECRET',
    'ADMIN_SESSION_SECRET'
];

const optionalVars = [
    'NODE_ENV',
    'PORT',
    'FRONTEND_URL',
    'SENTRY_DSN',
    'LOG_LEVEL'
];

if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    console.log('📝 Create .env file from .env.example or run: npm run generate-secrets');
    process.exit(1);
}

console.log('✅ .env file found');

const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const envVars = {};

// Parse .env file
envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            envVars[key] = valueParts.join('=');
        }
    }
});

console.log('\n📋 Required Variables:');
let missingRequired = 0;
let placeholderSecrets = 0;

requiredVars.forEach(varName => {
    const value = envVars[varName];
    if (!value) {
        console.log(`❌ ${varName}: Missing`);
        missingRequired++;
    } else if (value === 'your_password_here' || value === 'placeholder' || value.startsWith('your_super_secret_')) {
        console.log(`⚠️  ${varName}: Placeholder value (needs to be changed)`);
        placeholderSecrets++;
    } else {
        console.log(`✅ ${varName}: Set`);
    }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
    const value = envVars[varName];
    if (!value) {
        console.log(`⚪ ${varName}: Not set (optional)`);
    } else {
        console.log(`✅ ${varName}: ${value}`);
    }
});

// Check for secrets that look like placeholders
const secretVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ADMIN_COOKIE_SECRET', 'ADMIN_SESSION_SECRET'];
let needsSecrets = false;

secretVars.forEach(varName => {
    const value = envVars[varName];
    if (!value || value.length < 32 || value === 'placeholder') {
        needsSecrets = true;
    }
});

console.log('\n📊 Summary:');
if (missingRequired > 0) {
    console.log(`❌ ${missingRequired} required variables missing`);
}
if (placeholderSecrets > 0) {
    console.log(`⚠️  ${placeholderSecrets} placeholder values need to be changed`);
}
if (needsSecrets) {
    console.log(`🔐 Generate secrets: npm run generate-secrets --update`);
}

if (missingRequired === 0 && placeholderSecrets === 0 && !needsSecrets) {
    console.log('✅ All configuration looks good!');
    console.log('🚀 Ready to run: npm run dev');
} else {
    console.log('❗ Please fix the issues above before starting the server');
    process.exit(1);
}
