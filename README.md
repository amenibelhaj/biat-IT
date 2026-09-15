# BIAT IT Asset Lifecycle & Obsolescence Management

Web application for tracking the lifecycle and obsolescence risk of a bank's IT
assets (servers, network equipment, software licences), replacing manual
Excel-based tracking.

- **Backend:** Node.js / Express / PostgreSQL (`backend/`)
- **Frontend:** React (Create React App) (`biat-frontend/`)

## Project structure

```
backend/
  database_schema.sql   run once against your database to create all tables
  server.js             API routes
  importHandler.js      Excel/CSV import + obsolescence scoring
  seedData.js           optional: inserts 10 sample assets
biat-frontend/          React app (inventory, dashboards, import UI)
render.yaml             Render Blueprint (deploys both services)
```

## Running locally

**1. Database** — create a PostgreSQL database (local, or free at neon.tech),
then load the schema:

```bash
psql "$DATABASE_URL" -f backend/database_schema.sql
```

**2. Backend**

```bash
cd backend
cp .env.example .env     # fill in DATABASE_URL
npm install
npm run dev              # http://localhost:5000
```

Optional sample data: `node seedData.js`

**3. Frontend**

```bash
cd biat-frontend
npm install
npm start                # http://localhost:3000
```

## Deploying for free (Neon + Render)

Neon's free Postgres tier is permanent; Render's free web service and static
site tiers are too (they sleep after 15 minutes idle, so the first request
after a pause takes 30-60 seconds).

**1. Database — Neon**
1. Sign up at neon.tech and create a project.
2. Copy the connection string (`postgresql://...`).
3. Open the Neon SQL Editor, paste the contents of
   `backend/database_schema.sql`, and run it.

**2. Backend + frontend — Render**
1. Push this repo to GitHub.
2. In the Render dashboard: **New -> Blueprint**, select the repo. It reads
   `render.yaml` and creates both services.
3. Set the environment variables:
   - backend `DATABASE_URL` = your Neon connection string
   - frontend `REACT_APP_API_URL` = your backend URL + `/api`
4. After setting `REACT_APP_API_URL`, trigger **Manual Deploy -> Deploy latest
   commit** on the frontend. React reads this value at build time, so it only
   takes effect on a rebuild.
5. Set the backend's `FRONTEND_URL` to your frontend's address so CORS is
   restricted to it.
