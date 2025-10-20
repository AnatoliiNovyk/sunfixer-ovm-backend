# SunFixer & OVM Backend API

Backend API for the Ukrainian electronic music duo **SunFixer & OVM** and their record label **CORE64 Records**.

## 🎛️ Graphical Admin Panel (NEW)
A full-featured AdminJS panel is integrated and available at:

- URL: `http://localhost:3000/admin`
- Auth method: database users (role = `admin`)
- Default admin after seeding:
  - Email: `admin@core64records.com`
  - Password: `admin123!`

Features inside admin:
- Dashboard with KPIs (releases, events, contacts, subscribers)
- Users management (admins and users)
- Releases CRUD (genre, cover/audio URLs, featured, play_count)
- Events CRUD (date, venue, status)
- Contacts inbox with status flow (new/read/replied)
- Newsletter subscribers (export-ready)

Security & sessions:
- Auth with bcrypt + sessions (express-session)
- Rate limiting (skips `/admin` UI routes), helmet
- Role-based access (admin only)

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
- **AdminJS** - Graphical admin panel
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

### 3.1 Generate Secrets (REQUIRED)
Generate ALL 4 secrets before running migrations:

Node (one-liners):
```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ADMIN_COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ADMIN_SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

Alternative:
- OpenSSL: `openssl rand -hex 32`
- Python: `python -c "import secrets; print(secrets.token_hex(32))"`

Paste the values into `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sunfixer_ovm
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_generated_jwt_secret
JWT_REFRESH_SECRET=your_generated_refresh_secret
ADMIN_COOKIE_SECRET=your_generated_admin_cookie_secret
ADMIN_SESSION_SECRET=your_generated_admin_session_secret
```

### 4. Database Setup
```bash
# Create PostgreSQL database
# Windows: if createdb is not in PATH, use full path or pgAdmin
createdb -U postgres sunfixer_ovm

# Run migrations
npm run db:migrate

# Seed sample data (creates default admin)
npm run db:seed
```

Troubleshooting auth errors (code 28P01):
- Ensure `DB_USER`/`DB_PASSWORD` in `.env` match your local PostgreSQL credentials
- Try: `psql -U postgres -h localhost` to verify the password
- If needed, reset password: `ALTER USER postgres PASSWORD 'new_password';`

### 5. Start Development Server
```bash
npm run dev
```

- API: `http://localhost:3000`
- Admin Panel: `http://localhost:3000/admin`
- Health: `http://localhost:3000/health`

## 🔑 Authentication (API)

Include the token in the Authorization header:
```bash
Authorization: Bearer <your_jwt_token>
```

Default admin (after seeding):
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
GET    /api/auth/me            - Get user profile
POST   /api/auth/logout        - User logout
```

### Releases
```
GET    /api/releases           - Get all releases
GET    /api/releases/:id       - Get specific release
POST   /api/releases           - Create release (admin)
PUT    /api/releases/:id       - Update release (admin)
DELETE /api/releases/:id       - Delete release (admin)
POST   /api/releases/:id/play  - Increment play count
```

### Events
```
GET    /api/events             - Get all events
GET    /api/events/:id         - Get specific event
POST   /api/events             - Create event (admin)
PUT    /api/events/:id         - Update event (admin)
DELETE /api/events/:id         - Delete event (admin)
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
POST   /api/upload/image               - Upload image (admin)
POST   /api/upload/audio               - Upload audio (admin)
GET    /api/upload/images/:filename    - Serve image file
GET    /api/upload/audio/:filename     - Serve audio file
```

## 🐳 Docker

```bash
# Build
docker build -t sunfixer-ovm-backend .

# Run
docker run -d \
  -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_NAME=sunfixer_ovm \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your_password \
  -e JWT_SECRET=your_jwt_secret \
  -e JWT_REFRESH_SECRET=your_refresh_secret \
  -e ADMIN_COOKIE_SECRET=your_cookie_secret \
  -e ADMIN_SESSION_SECRET=your_session_secret \
  --name sunfixer-backend \
  sunfixer-ovm-backend
```

## 🧱 Project Structure (relevant)
```
src/
├── admin/
│   ├── config.js          # AdminJS setup
│   └── dashboard.jsx      # Admin dashboard component
├── app.js                 # Express app (admin mounted at /admin)
├── database/
│   ├── connection.js      # PostgreSQL pool
│   ├── migrate.js         # Migrations
│   └── seed.js            # Seed (creates default admin)
├── middleware/
│   └── auth.js            # JWT auth middleware
├── routes/
│   ├── auth.js            # Auth endpoints
│   ├── releases.js        # Releases CRUD
│   ├── events.js          # Events CRUD
│   ├── contact.js         # Contacts
│   ├── newsletter.js      # Newsletter
│   └── upload.js          # Upload endpoints
└── utils/
    └── logger.js          # Logging
```

## 📎 Notes
- Admin panel is protected; only `role=admin` users can access
- You can create more admins via `/admin` -> Users
- Uploads served from `/uploads` path

## ❗ Gotchas / Troubleshooting
- `createdb: command not found` on Windows: add `C:\\Program Files\\PostgreSQL\\XX\\bin` to PATH or use pgAdmin
- Auth error `28P01`: check `.env` DB_USER/DB_PASSWORD, verify with `psql -U postgres -h localhost`
- Ensure all 4 secrets are generated and present in `.env` before migrations

## 📄 License

© 2025 SunFixer & OVM. All rights reserved.  
CORE64 Records - Ukrainian Electronic Music

---

**Built with ❤️ in Ukraine** 🇺🇦

For support: **backend@core64records.com**