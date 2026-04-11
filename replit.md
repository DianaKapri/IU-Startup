# ШколаПлан — School Schedule System

## Overview
ШколаПлан is an automated school scheduling system that helps schools create optimized timetables while ensuring compliance with Russian sanitary regulations (SanPiN 1.2.3685-21).

## Key Features
- **SanPiN Audit**: Automatically checks schedules for 47+ regulatory violations
- **Smart Parser**: Excel/CSV parser with fuzzy matching for teacher names and subjects
- **Schedule Generation**: Algorithmic schedule generation with IEP (IUP) support
- **Emergency Substitutions**: AI-assisted teacher replacement suggestions

## Project Structure
```
server.js                    # Root entry point: serves frontend + proxies API
package.json                 # Root package.json

projects/
  frontend/                  # Static HTML/CSS/JS frontend (landing, demo, login)
    index.html               # Landing page
    demo.html                # Demo page
    login.html               # Login page
    account.html             # User account page
    css/                     # Stylesheets
    js/                      # Frontend scripts

  sanpin-audit-ui/           # Backend Express API
    app.js                   # Express entry point (runs on port 4000)
    package.json
    config/database.js       # PostgreSQL connection pool
    middleware/upload.js     # File upload middleware (multer)
    routes/schedules.js      # Schedule upload/status endpoints
    services/parser/         # Excel file parser
    services/audit/          # SanPiN audit logic
    services/template/       # Excel template generation
    migrations/              # SQL migration files

  schedule-generator/        # Schedule generation microservice
  services/                  # Shared service logic
```

## Architecture
- **Frontend**: Static files served by Express from `projects/frontend/` on port 5000
- **Backend API**: Express app in `projects/sanpin-audit-ui/` on port 4000
- **Proxy**: Root server proxies `/api/*` requests from port 5000 → 4000
- **Database**: Replit PostgreSQL (DATABASE_URL env var)

## Database Schema
- `schools` — School records
- `users` — User accounts (linked to schools)
- `schedules` — Uploaded schedule files with parsing status
- `audit_results` — SanPiN audit results for schedules

## Running the App
```bash
node server.js   # Starts frontend (port 5000) + backend (port 4000)
```

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (set by Replit)
- `PORT` — Backend port (defaults to 4000)
- `FRONTEND_URL` — Allowed CORS origin (defaults to http://localhost:3000)
- `NODE_ENV` — Environment mode (development/production)

## Dependencies
- **Root**: express (static server + proxy)
- **Backend**: express, cors, helmet, multer, pg, xlsx, exceljs, dotenv
