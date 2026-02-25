# CNC Machine Job Handler

A full-stack job orchestration platform that manages CNC machining jobs from intake to completion. Jobs come in with priorities and machine requirements, a scheduler figures out who does what, and everything updates in real time — no refreshing needed.

This was built as a portfolio project targeting mid-level software engineering roles, so every decision here was made with intentionality. I wanted to go beyond a basic CRUD app and tackle some concepts I hadn't worked with before — like Redis queues, WebSocket connections, and PostgreSQL transactions.

---

## Tech Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL
- **Queue:** Redis
- **Real-time:** WebSockets
- **Infrastructure:** Docker + Docker Compose
- **Host**: Railway

---

## The Breakdown

Here's what this app actually does:

- **Job Queue** — jobs are submitted with a name, material, complexity, machine type requirement, and priority. The scheduler picks them up automatically and assigns them to the best available machine.
- **Machine Fleet** — a pre-seeded set of mills, lathes, and drills. Machines go from `idle` → `running` → `idle` as jobs are processed.
- **Real-time Updates** — WebSockets push live updates to the browser whenever a job changes state, so the dashboard reflects what's happening without any manual refreshing.
- **Retry Logic** — complexity-5 jobs have a 25% chance of simulated failure, which triggers an automatic retry (up to 2 retries). It's a contrived example, but it demonstrates the pattern nicely.
- **Event History** — every state change gets logged to an `events` table. The job detail page shows the full timeline, oldest to newest.
- **Crash Recovery** — if the backend goes down mid-run, jobs stuck in `assigned` or `running` get reset and re-queued on the next startup. It's one of those features you hope you never need, but are really glad exists when you do.

---

## Getting Started

You'll need Docker and Docker Compose installed. That's it — everything else runs inside containers.

**1. Clone the repo**
```bash
git clone <your-repo-url>
cd cnc-machine-job-handler
```

**2. Set up your environment variables**
```bash
cp .env.example .env
```
The defaults in `.env.example` work out of the box — no changes needed for local development.

**3. Start everything up**
```bash
docker compose up --build
```

Give it a moment on the first run (it needs to pull images and install dependencies). Once it's ready:

- **Frontend** → http://localhost:5174
- **Backend API** → http://localhost:3001
- **Health check** → http://localhost:3001/health

---

## Environment Variables

```
# ---- Postgres ----
POSTGRES_USER=machine_user
POSTGRES_PASSWORD=machine_pass
POSTGRES_DB=jobs

# ---- Backend ----
PORT=3001
DATABASE_URL=postgres://machine_user:machine_pass@postgres:5432/jobs
REDIS_URL=redis://redis:6379
NODE_ENV=development

# ---- Frontend ----
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

`.env` is gitignored — only `.env.example` is committed. Don't push your env file!

---

## API Reference

All routes are prefixed with `/api`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/machines` | List all machines with active job count |
| GET | `/api/machines/:id` | Get one machine |
| GET | `/api/jobs` | List all jobs (filter by `?status=` or `?machine_id=`) |
| POST | `/api/jobs` | Create a new job |
| GET | `/api/jobs/:id` | Get one job with its full event history |
| PATCH | `/api/jobs/:id/status` | Manually override a job's status |

**Creating a job** — required fields: `name`, `material`, `complexity` (1–5), `required_machine_type`. Optional: `priority` (default `0`), `estimated_runtime` (seconds).

```bash
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bracket v2",
    "material": "aluminum",
    "complexity": 3,
    "required_machine_type": "mill",
    "priority": 2,
    "estimated_runtime": 8
  }'
```

Don't pass `assigned_machine_id` from the frontend — the scheduler handles assignment automatically.

---

## Project Structure

```
CNC-MACHINE-JOB-HANDLER/
├── docker-compose.yml
├── .env.example
├── infra/
│   ├── postgres/init.sql     ← schema + seed data
│   └── redis/redis.conf
├── backend/src/
│   ├── config/               ← environment variables
│   ├── routes/               ← URL → controller mapping
│   ├── controllers/          ← input validation + HTTP responses
│   ├── services/             ← SQL queries + business logic
│   ├── workers/scheduler.ts  ← main job processing loop
│   ├── websocket/            ← real-time bridge to the browser
│   └── db/                   ← postgres pool + redis clients
└── frontend/src/
    ├── types/                ← shared TypeScript interfaces
    ├── api/                  ← all fetch() calls in one place
    ├── hooks/                ← useMachines, useJobs, useWebSocket
    ├── components/           ← MachineCard, JobRow, JobForm, StatusBadge
    └── pages/                ← DashboardPage, JobDetailPage
```

The backend follows a strict **Routes → Controllers → Services** pattern. Routes just map URLs to functions. Controllers validate input and return HTTP responses. Services handle all the SQL and business logic. Keeping these concerns separate means things are a lot easier to trace when something breaks — and something will always break at some point. 😅

---

## Architecture Notes

A few things worth understanding before diving into the code:

**Why Redis?** — PostgreSQL is great for storing data, but it's not built for queue operations. Redis's sorted set (`ZADD`/`BZPOPMAX`) gives us a priority queue where the scheduler can block-wait for the next job rather than polling on a timer. Higher priority score = processed first.

**Why three Redis clients?** — Once a Redis client subscribes to a channel, it can't issue regular commands anymore. So we keep them separated: `redisClient` for queue operations, `redisPublisher` for broadcasting updates, and a dedicated `redisSubscriber` inside the WebSocket server for listening.

**Why PostgreSQL transactions?** — Any write that touches multiple tables (e.g. creating a job *and* logging a creation event) is wrapped in a `BEGIN`/`COMMIT`/`ROLLBACK` transaction. If one part fails, the whole thing rolls back. You never want a job in the DB with no event history attached to it.

**Why `FOR UPDATE SKIP LOCKED`?** — The scheduler uses this Postgres feature when grabbing an idle machine. It row-locks the machine so that if two scheduler instances run simultaneously, they can't accidentally assign two jobs to the same machine at the same time.

---

## Docker Commands

```bash
# Start everything
docker compose up

# Rebuild images after config changes
docker compose up --build

# Rebuild a single container
docker compose up --build backend

# Full reset (removes containers)
docker compose down
```

---

## What I Learned

Honestly, this was the most backend-heavy project I'd taken on at the time of building it, and there was a lot of new ground covered:

- **Redis as a job queue** — using sorted sets for priority ordering and `BZPOPMAX` for blocking pops was a really satisfying pattern to learn. Way cleaner than polling.
- **PostgreSQL transactions** — I knew transactions existed before this, but actually implementing them for multi-table writes made the concept click in a way it hadn't before.
- **WebSockets** — getting the real-time pipeline working (scheduler → Redis pub/sub → WebSocket server → browser) was one of the more "wow, it's actually working" moments of the project.
- **Crash recovery** — thinking through failure scenarios and writing `recoverStaleJobs` forced me to think about state in a more rigorous way than I was used to.

If you want to dig into the code, feel free to browse the repo — everything is commented and structured to be as readable as possible!
