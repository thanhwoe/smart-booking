# Smart Booking Platform

NestJS API for a smart booking system with Clerk auth, Stripe payments, Redis caching, BullMQ queues, and Prisma ORM.

## Tech Stack

| Layer        | Technology                |
| ------------ | ------------------------- |
| Framework    | NestJS + TypeScript       |
| Database     | PostgreSQL + Prisma ORM   |
| Auth         | Clerk                     |
| Cache / Lock | Redis (ioredis + Redlock) |
| Queue        | BullMQ                    |
| Payment      | Stripe                    |
| Email        | Resend                    |
| CI/CD        | GitHub Actions            |
| Deployment   | Railway + Docker          |
| Secrets      | Doppler                   |

---

## Architecture Overview

```
Client
  │
  ▼
NestJS API
  ├── Auth guard (Clerk JWT)
  ├── Rate limiter (Redis)
  ├── Booking module
  │     ├── Redlock → acquire lock on slotId
  │     ├── Prisma transaction → check capacity + create booking
  │     └── Release lock
  ├── Payment module
  │     ├── Stripe Checkout Session
  │     └── Webhook handler (idempotency via stripe_events table)
  └── Queue (BullMQ)
        ├── email-confirm job → Resend
        ├── email-reminder job → Resend
        └── Cron: cancel expired PENDING bookings
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- Yarn 1.x
- Docker + Docker Compose
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) (recommended)
- Stripe CLI (for local webhook testing)
- Clerk, Resend, and Supabase accounts

### 1. Clone and install

```bash
git clone <your-github-repo-url>
cd smart-booking
yarn install
```

### 2. Environment variables

Copy the template and fill in values, or use Doppler (recommended):

```bash
cp .env.example .env
```

For Doppler-based local development:

```bash
doppler login
doppler setup --project smart-booking --config development
doppler run -- yarn start:dev
```

See [docs/doppler-setup.md](./docs/doppler-setup.md) for the full secrets list and setup.

### 3. Start local infrastructure

```bash
docker compose up -d redis postgres_test
```

This starts:

- Redis on port `6379`
- PostgreSQL (test) on port `5433`

> For local app development, point `DATABASE_URL` in `.env` to your Supabase dev database or a local Postgres instance.

### 4. Run migrations

```bash
doppler run -- npx prisma migrate dev --name init
# or without Doppler:
yarn db:generate
npx prisma migrate dev --name init
```

### 5. Start the app

```bash
# Development
doppler run -- yarn start:dev

# Production locally
yarn build
yarn start:prod
```

### 6. Test webhooks locally

```bash
stripe listen --forward-to localhost:3000/api/v1/payments/webhook
```

---

## CI/CD

| Workflow | Trigger | Action |
|----------|---------|--------|
| [CI](.github/workflows/ci.yml) | PR + push to `main`/`develop` | Lint, typecheck, unit tests, build, Docker validation |
| [Deploy Staging](.github/workflows/deploy-staging.yml) | Push to `develop` | Deploy to Railway staging, migrate, smoke test |
| [Deploy Production](.github/workflows/deploy-production.yml) | CI success on `main` | Deploy to Railway production, migrate, health verify |

### Branching

- `develop` → staging
- `main` → production
- Pull requests required — no direct pushes to protected branches

See [docs/branching-strategy.md](./docs/branching-strategy.md).

### First-time infrastructure setup

Manual steps you must complete outside this repository:

1. [Doppler project and secrets](./docs/doppler-setup.md)
2. [Railway staging + production services](./docs/railway-setup.md)
3. GitHub Actions secrets (Doppler tokens, Railway token, service IDs)
4. GitHub branch protection for `main` and `develop`

---

## Health Checks

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/v1/health/live` | Public | Liveness probe |
| `GET /api/v1/health/ready` | Public | Readiness (DB + Redis) |
| `GET /api/v1/health` | Public | Readiness alias |

Used by Docker, Railway, and deployment smoke tests.

---

## API Reference

All routes are prefixed with `/api/v1`. Swagger docs: `/api/docs`.

### Auth

All endpoints require `Authorization: Bearer <clerk_jwt>` except webhooks and health checks.

### Bookings

| Method | Endpoint        | Description              |
| ------ | --------------- | ------------------------ |
| GET    | `/slots`        | Get all slots            |
| GET    | `/slots/:id`    | Get slot by id           |
| POST   | `/bookings`     | Create new booking       |
| GET    | `/bookings`     | Get all bookings of user |
| GET    | `/bookings/:id` | Get booking by id        |
| DELETE | `/bookings/:id` | Cancel booking           |

### Payments

| Method | Endpoint                        | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| POST   | `/payments/checkout/:bookingId` | Create Stripe Checkout Session |
| POST   | `/payments/webhook`             | Stripe webhook (no auth)       |
| POST   | `/payments/refund/:bookingId`   | Refund booking                 |

### Webhooks (public)

| Provider | Endpoint |
|----------|----------|
| Clerk | `/api/v1/auth/webhook` |
| Stripe | `/api/v1/payments/webhook` |
| Resend | `/api/v1/email/webhook` |

---

## Project Structure

```
src/
├── database/prisma/      # Prisma module
├── health/               # Liveness/readiness endpoints
├── modules/
│   ├── auth/             # Clerk JWT + webhooks
│   ├── users/
│   ├── services/
│   ├── slots/
│   ├── bookings/         # Core booking logic + Redlock
│   ├── payments/         # Stripe checkout + webhook
│   ├── email-logs/
│   └── shared/           # Redis, cache, BullMQ, email, PostHog
├── guards/
├── interceptors/
├── filters/
└── decorators/
prisma/
├── schema.prisma
└── migrations/
test/
├── unit/
└── e2e/
docs/
├── branching-strategy.md
├── doppler-setup.md
└── railway-setup.md
.github/workflows/
├── ci.yml
├── deploy-staging.yml
└── deploy-production.yml
Dockerfile              # Production multi-stage build
Dockerfile.dev          # Local development with hot reload
docker-compose.yml
railway.json
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `yarn start:dev` | Development server with watch mode |
| `yarn build` | Production build (runs `prisma generate` first) |
| `yarn start:prod` | Run compiled app |
| `yarn lint:check` | ESLint without auto-fix (CI) |
| `yarn lint` | ESLint with auto-fix |
| `yarn typecheck` | TypeScript check without emit |
| `yarn test:unit` | Unit tests |
| `yarn test:e2e` | E2E tests (requires Redis + postgres_test) |
| `yarn db:generate` | Generate Prisma client |
| `yarn db:migrate` | Create migration (`yarn db:migrate <name>`) |
| `yarn docker:up` | Start Docker Compose stack |
| `yarn docker:down` | Tear down Docker Compose stack |

---

## Running Tests

```bash
# Start test dependencies
docker compose up -d redis postgres_test

# Unit tests
yarn test:unit

# E2E tests (runs prisma migrate deploy via pretest:e2e)
yarn test:e2e
```

---

## Docker

```bash
# Local development stack (hot reload via Dockerfile.dev)
yarn docker:up

# Production image build
docker build --target production -t smart-booking:local .
```

---

## Documentation

- [Branching Strategy](./docs/branching-strategy.md)
- [Doppler Setup](./docs/doppler-setup.md)
- [Railway Deployment](./docs/railway-setup.md)
