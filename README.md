# SunFixer & OVM Backend API

Backend API for the Ukrainian electronic music duo **SunFixer & OVM** and their record label **CORE64 Records**.

## 🚀 Features

- **Authentication & Authorization** - JWT-based auth with admin roles
- **Music Releases Management** - CRUD operations for releases
- **Events/Shows Management** - Concert and event management
- **Contact Forms** - Contact form submissions with admin panel
- **Newsletter System** - Email subscription management
- **File Upload** - Image and audio file upload functionality
- **Security** - Rate limiting, CORS, helmet security headers
- **Logging** - Winston-based comprehensive logging
- **Error Tracking** - Sentry integration for production
- **Database** - PostgreSQL with connection pooling

## 🛠 Tech Stack

- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Winston** - Logging
- **Multer** - File uploads
- **Sentry** - Error tracking
- **Docker** - Containerization

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- (Optional) Docker for containerization

## ⚡ Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/AnatoliiNovyk/sunfixer-ovm-backend.git
cd sunfixer-ovm-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Database Setup
```bash
# Create PostgreSQL database
createdb sunfixer_ovm

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 🔑 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

### Default Admin User
After seeding, you can login with:
```
Email: admin@core64records.com
Password: admin123!
```

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login         - User login
POST   /api/auth/register      - User registration
POST   /api/auth/refresh       - Refresh access token
GET    /api/auth/me           - Get user profile
POST   /api/auth/logout       - User logout
```

### Releases
```
GET    /api/releases          - Get all releases
GET    /api/releases/:id      - Get specific release
POST   /api/releases          - Create release (admin)
PUT    /api/releases/:id      - Update release (admin)
DELETE /api/releases/:id      - Delete release (admin)
POST   /api/releases/:id/play - Increment play count
```

### Events
```
GET    /api/events           - Get all events
GET    /api/events/:id       - Get specific event
POST   /api/events           - Create event (admin)
PUT    /api/events/:id       - Update event (admin)
DELETE /api/events/:id       - Delete event (admin)
```

### Contact & Newsletter
```
POST   /api/contact                    - Submit contact form
GET    /api/contact                    - Get contacts (admin)
PUT    /api/contact/:id/status         - Update contact status (admin)
POST   /api/newsletter/subscribe       - Subscribe to newsletter
POST   /api/newsletter/unsubscribe     - Unsubscribe from newsletter
GET    /api/newsletter                 - Get subscribers (admin)
```

### File Upload
```
POST   /api/upload/image      - Upload image (admin)
POST   /api/upload/audio      - Upload audio (admin)
GET    /api/upload/images/:filename - Serve image file
GET    /api/upload/audio/:filename  - Serve audio file
```

## 🚦 Health Check

The API provides a health check endpoint:

```bash
GET /health
```

## 📄 License

© 2025 SunFixer & OVM. All rights reserved.  
CORE64 Records - Ukrainian Electronic Music

---

**Built with ❤️ in Ukraine** 🇺🇦

For support: **backend@core64records.com**