# FocusGrid

A study planning app with AI-powered scheduling for enhanced productivity.

## Vision

To create a seamless study planning experience that leverages AI to enhance productivity and learning outcomes.

## Problem

Students and professionals often struggle to manage their study schedules effectively, leading to stress and decreased performance.

## Solution

FocusGrid offers an intelligent scheduling solution that adapts to users' needs, helping them organize their study time efficiently.

## Features

- AI-driven scheduling recommendations
- User-friendly interface for managing study plans
- Integration with various educational resources

## AI Integration

FocusGrid utilizes AI algorithms to analyze user preferences and study habits, providing personalized recommendations for optimal study schedules.

---

## 🔧 Tech Stack

### Frontend (client)
- Vite + React 18 + TypeScript
- Tailwind CSS for styling
- Radix UI components
- React Hook Form + Zod for validation
- Wouter for routing
- React Query for API data fetching

### Backend (server)
- Node.js (v20.11.1)
- Express.js
- SQLite with Drizzle ORM
- REST API with endpoints for study plans and AI integration
- JWT-based authentication

---

## 📦 Project Structure

This is a monorepo containing both the frontend and backend code:

```
/client     - React frontend (Vite + React 18 + TypeScript)
/server     - Express backend (Node.js + Express + SQLite with Drizzle ORM)
/shared     - Shared types and schemas
```

## Getting Started

### Prerequisites
- Node.js v20.11.1 or later
  ```bash
  # Check your Node version
  node --version
  
  # If using nvm, you can switch to the correct version
  nvm use
  ```
- npm v10 or later
  ```bash
  # Check your npm version
  npm --version
  ```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/focusgrid.git
cd focusgrid
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp client/.env.example client/.env
cp server/.env.example server/.env

# Edit the .env files with your editor and add required API keys
```

4. Set up the database:
```bash
npm run db:migrate
```

### Development Workflow

#### Start all services in development mode
```bash
npm run dev
```
This will start:
- Client at http://localhost:5173
- Server at http://localhost:3000
- Shared package in watch mode

#### Start services individually
```bash
# Frontend only
npm run dev:client

# Backend only
npm run dev:server

# Database UI (browse SQLite data)
npm run db:studio
```

#### Other commands
```bash
# Clean build outputs (removes all dist directories)
npm run clean

# Build all packages for production
npm run build

# Start production build
npm run start
```

## Production Deployment

### Building for Production

```bash
npm run build
```

This builds the shared library, client, and server applications in the correct order.

### Deployment Options

#### Client (Vercel)
1. Connect your GitHub repository to Vercel
2. Set the build command to `npm run build:client`
3. Set the output directory to `client/dist`
4. Configure environment variables in the Vercel dashboard

#### Server (Railway)
1. Connect your GitHub repository to Railway
2. Set the build command to `npm run build:server`
3. Set the start command to `npm run start --workspace=server`
4. Configure environment variables in the Railway dashboard

## Environment Variables

### Client (.env)
```
VITE_API_URL=http://localhost:3000/api
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
```

### Server (.env)
```
PORT=3000
NODE_ENV=development
DATABASE_URL=file:./data.db
CORS_ORIGINS=http://localhost:5173
AUTH_SECRET=your_auth_secret_here
OPENROUTER_API_KEY=your_openrouter_api_key
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.