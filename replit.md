# FormaFlow - Plateforme de Gestion de Formation

## Overview
Training management platform (similar to Digiforma) for managing training programs, sessions, trainees, and trainers. Built with React + Express + PostgreSQL.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI + Wouter routing
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: TanStack React Query

## Data Models
- **Programs**: Training programs (title, category, duration, price, level, status)
- **Sessions**: Training sessions linked to programs and trainers
- **Trainers**: Trainer profiles (name, email, specialty, bio)
- **Trainees**: Trainee profiles (name, email, company)
- **Enrollments**: Session-trainee relationships

## Pages
- `/` - Dashboard with stats overview
- `/programs` - Training programs CRUD
- `/sessions` - Training sessions CRUD
- `/trainees` - Trainees management (table view)
- `/trainers` - Trainers management (card view)

## API Routes
All prefixed with `/api/`:
- GET/POST `/trainers`, GET/PATCH/DELETE `/trainers/:id`
- GET/POST `/trainees`, GET/PATCH/DELETE `/trainees/:id`
- GET/POST `/programs`, GET/PATCH/DELETE `/programs/:id`
- GET/POST `/sessions`, GET/PATCH/DELETE `/sessions/:id`
- GET/POST `/enrollments`, DELETE `/enrollments/:id`

## Running
- `npm run dev` starts both Express backend and Vite frontend on port 5000
- `npm run db:push` pushes schema changes to PostgreSQL

## Recent Changes
- Initial MVP build with full CRUD for all entities
- Seed data with realistic French training content
- Dashboard with activity overview
- Dark mode support via ThemeProvider
