# Entity Reporting Dashboard

A comprehensive dashboard application for managing entities, team planning, and reporting.

## Features

- 📊 Entity management with profiles, limits, and configurations
- 👥 Team planning and scheduling
- 📈 Reporting and analytics
- 🔐 User authentication with role-based access
- 📱 Responsive design

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Prisma

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Abdeslamghailan/Dashborad.git
cd Dashborad
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd server
npm install
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your settings
```

5. Run database migrations:
```bash
npx prisma migrate dev
```

6. Start the development servers:
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev
```

## Deployment

See [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md) for deployment instructions.

## License

MIT
"# Dashborad" 
