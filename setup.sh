#!/bin/bash

# SunFixer & OVM Backend Setup Script
# Automated setup for local development

set -e

echo "🎵 SunFixer & OVM Backend Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Step 1: Check prerequisites
echo ""
print_info "Step 1: Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    print_error "Node.js version 18+ required. Current: $(node --version)"
    exit 1
fi
print_success "Node.js $(node --version) found"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm not found."
    exit 1
fi
print_success "npm $(npm --version) found"

# Check if PostgreSQL is accessible
if command -v psql &> /dev/null; then
    print_success "PostgreSQL client found"
    PG_AVAILABLE=true
elif command -v createdb &> /dev/null; then
    print_success "PostgreSQL createdb found"
    PG_AVAILABLE=true
else
    print_warning "PostgreSQL CLI tools not found in PATH"
    print_info "You'll need to create database manually via pgAdmin or add PostgreSQL to PATH"
    PG_AVAILABLE=false
fi

# Step 2: Install dependencies
echo ""
print_info "Step 2: Installing Node.js dependencies..."
npm install
print_success "Dependencies installed"

# Step 3: Environment setup
echo ""
print_info "Step 3: Setting up environment..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Copied .env.example to .env"
    else
        print_warning ".env.example not found, creating basic .env"
        cat > .env << EOF
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sunfixer_ovm
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration (will be generated)
JWT_SECRET=placeholder
JWT_REFRESH_SECRET=placeholder

# Admin Panel Configuration (will be generated)
ADMIN_COOKIE_SECRET=placeholder
ADMIN_SESSION_SECRET=placeholder

# Optional
SENTRY_DSN=
LOG_LEVEL=info
EOF
    fi
else
    print_info ".env file already exists"
fi

# Step 4: Generate secrets
echo ""
print_info "Step 4: Generating security secrets..."

# Check if Node.js crypto is available
if command -v node &> /dev/null; then
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    ADMIN_COOKIE_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    ADMIN_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # Update .env file with generated secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        sed -i '' "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
        sed -i '' "s/ADMIN_COOKIE_SECRET=.*/ADMIN_COOKIE_SECRET=$ADMIN_COOKIE_SECRET/" .env
        sed -i '' "s/ADMIN_SESSION_SECRET=.*/ADMIN_SESSION_SECRET=$ADMIN_SESSION_SECRET/" .env
    else
        # Linux
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
        sed -i "s/ADMIN_COOKIE_SECRET=.*/ADMIN_COOKIE_SECRET=$ADMIN_COOKIE_SECRET/" .env
        sed -i "s/ADMIN_SESSION_SECRET=.*/ADMIN_SESSION_SECRET=$ADMIN_SESSION_SECRET/" .env
    fi
    
    print_success "Generated and updated 4 security secrets in .env"
else
    print_error "Could not generate secrets automatically"
    exit 1
fi

# Step 5: Database setup
echo ""
print_info "Step 5: Database setup..."

# Prompt for database password
echo ""
print_info "Please enter your PostgreSQL password for user 'postgres':"
read -s DB_PASSWORD

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
else
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
fi

# Try to create database
if [ "$PG_AVAILABLE" = true ]; then
    print_info "Attempting to create database 'sunfixer_ovm'..."
    
    if createdb -U postgres sunfixer_ovm 2>/dev/null; then
        print_success "Database 'sunfixer_ovm' created successfully"
    elif psql -U postgres -lqt | cut -d \| -f 1 | grep -qw sunfixer_ovm; then
        print_info "Database 'sunfixer_ovm' already exists"
    else
        print_warning "Could not create database automatically"
        print_info "Please create database manually: CREATE DATABASE sunfixer_ovm;"
    fi
else
    print_warning "Please create database 'sunfixer_ovm' manually using pgAdmin or psql"
fi

# Step 6: Run migrations
echo ""
print_info "Step 6: Running database migrations..."
if npm run db:migrate; then
    print_success "Database migrations completed"
else
    print_error "Database migrations failed"
    print_info "Please check your database connection settings in .env"
    exit 1
fi

# Step 7: Seed database
echo ""
print_info "Step 7: Seeding database with sample data..."
if npm run db:seed; then
    print_success "Database seeded with sample data"
else
    print_error "Database seeding failed"
    exit 1
fi

# Step 8: Final instructions
echo ""
print_success "🎉 Setup completed successfully!"

echo ""
print_info "To start the development server:"
print_info "  npm run dev"

echo ""
print_info "Your backend will be available at:"
print_info "  📡 API: http://localhost:3000"
print_info "  🎛️  Admin Panel: http://localhost:3000/admin"
print_info "  🏥 Health Check: http://localhost:3000/health"

echo ""
print_info "Default admin login:"
print_info "  📧 Email: admin@core64records.com"
print_info "  🔑 Password: admin123!"

echo ""
print_success "🎵 Ready to rock with SunFixer & OVM! 🎵"
