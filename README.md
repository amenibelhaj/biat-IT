# BIAT IT Asset Lifecycle & Obsolescence Management

Web application built for **BIAT** (Banque Internationale Arabe de Tunisie) to
track the lifecycle and obsolescence risk of the bank's IT assets — servers,
network equipment, storage, security appliances and software — replacing
manual Excel-based tracking with live dashboards and renewal planning.

**Live demo:** [biat-it-frontend.onrender.com](https://biat-it-frontend.onrender.com) — runs on demo data only; free hosting sleeps when idle, so the first load can take ~1 minute.

![React](https://img.shields.io/badge/React-CRA-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)

## Features

- **Excel / CSV import** of the bank's equipment inventory, with normalisation,
  import history and per-import detail
- **Automatic obsolescence classification** from end-of-support dates:
  expired (red), under 6 months (orange), under 12 months (yellow), supported (green),
  recalculated live every day
- **Executive dashboard** — fleet-wide KPIs at a glance
- **Risk heat map** crossing business criticality with obsolescence level
- **Replacement roadmap** and **budget forecast**, using real costs from the
  imported file or a built-in cost catalogue when none is given
- **Lifecycle analysis** and **financial summary** per family, site and budget line
- **Bilingual interface** (French / English)
- **Two deployment targets:** free cloud hosting (Render + Neon) for demos, and a
  hardened **internal VM deployment** (Docker Compose + Nginx) so bank data never
  leaves BIAT's infrastructure — see [`deploy/INSTALLATION.md`](deploy/INSTALLATION.md)

## Tech stack

- **Backend:** Node.js / Express / PostgreSQL (`backend/`)
- **Frontend:** React (Create React App) with charts and dashboards (`biat-frontend/`)
- **Deployment:** Docker, Nginx, systemd, Render Blueprint

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
