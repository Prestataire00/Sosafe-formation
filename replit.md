# SO'SAFE - Plateforme de Gestion de Formation Sant\u00e9

## Overview
Healthcare training management platform (similar to Digiforma) for SO'SAFE. Manages training programs (AFGSU, Certibiocide, healthcare certifications), sessions with capacity tracking, trainees, trainers, and enterprise clients. Built with React + Express + PostgreSQL.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI + Wouter routing
- **Backend**: Express.js REST API with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: TanStack React Query
- **Auth**: express-session + connect-pg-simple, scrypt password hashing

## Data Models
- **Users**: Auth accounts with roles (admin/trainer/trainee/enterprise)
- **Programs**: Training programs (title, category, duration, price, level, modality, certifying, recyclingMonths)
- **Sessions**: Training sessions (programId, trainerId, dates, location, modality, maxParticipants, status)
- **Trainers**: Trainer profiles (name, email, specialty, bio)
- **Trainees**: Trainee profiles (name, email, company)
- **Enterprises**: Client organizations (name, SIRET, sector, contact info)
- **Enrollments**: Session-trainee relationships with status workflow (registered/confirmed/completed/cancelled)

## Pages
- `/` - Dashboard with SO'SAFE branding, role-specific stats, enrollment counts
- `/programs` - Training catalog with SO'SAFE categories, modality badges, certification status
- `/sessions` - Sessions CRUD with capacity tracking ("places restantes/Complet")
- `/enrollments` - Enrollment management with status workflow and filtering
- `/trainees` - Trainees management (table view)
- `/trainers` - Trainers management (card view)
- `/enterprises` - Enterprise clients management

## API Routes
All prefixed with `/api/`:
- POST `/auth/login`, POST `/auth/register`, POST `/auth/logout`, GET `/auth/me`
- GET/POST `/trainers`, GET/PATCH/DELETE `/trainers/:id`
- GET/POST `/trainees`, GET/PATCH/DELETE `/trainees/:id`
- GET/POST `/programs`, GET/PATCH/DELETE `/programs/:id`
- GET/POST `/sessions`, GET/PATCH/DELETE `/sessions/:id`
- GET/POST `/enrollments`, PATCH/DELETE `/enrollments/:id`
- GET/POST `/enterprises`, GET/PATCH/DELETE `/enterprises/:id`

## Auth & Roles
- 4 roles: admin, trainer, trainee, enterprise
- Default admin account: admin / admin123
- Role-based sidebar navigation and dashboard views
- Session-based auth with PostgreSQL session store

## SO'SAFE-Specific Features
- Training categories: AFGSU, Certibiocide, Certificat de d\u00e9c\u00e8s, VAE, S\u00e9curit\u00e9 au travail, Gestes et postures, Management sant\u00e9, Hygi\u00e8ne, Premiers secours
- Modalities: pr\u00e9sentiel, distanciel, blended learning
- Certifying programs with recycling period (e.g., 48 months for AFGSU)
- Session capacity tracking with enrollment counts

## Running
- `npm run dev` starts both Express backend and Vite frontend on port 5000
- `npm run db:push` pushes schema changes to PostgreSQL

## Recent Changes (Feb 2026)
- Phase 1 complete: multi-role auth, SO'SAFE branding, enhanced catalog
- Session capacity tracking with "places restantes/Complet" badges
- Enrollment management page with status workflow
- Enterprise management for healthcare clients
- Role-aware dashboard and navigation
