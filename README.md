# Smart Booking Platform

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

- Node.js 20+
- Docker + Docker Compose
- Stripe CLI (for local webhook testing)
- Clerk account
- Resend account

### 1. Clone & install

```bash
git clone https://gitlab.asoft-python.com/thanh.nguyentrung/nestjs-training.git
git checkout feature/smart-booking

cd smart-booking

yarn install
```

### 2. Environment variables

```bash
cp .env.example .env
```

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/smart_booking"

# Redis
REDIS_URL="redis://localhost:6379"

# Clerk
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App
APP_URL=http://localhost:3000
```

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on port `5432` and Redis on port `6379`.

### 4. Run migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start the app

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### 6. Test Stripe webhooks locally

```bash
stripe listen --forward-to localhost:3000/payments/webhook
```

---

## API Reference

### Auth

All endpoints require `Authorization: Bearer <clerk_jwt>` header except where noted.

### Bookings

| Method | Endpoint        | Description              |
| ------ | --------------- | ------------------------ |
| GET    | `/slots`        | Danh sách slot khả dụng  |
| GET    | `/slots/:id`    | Chi tiết slot            |
| POST   | `/bookings`     | Tạo booking mới          |
| GET    | `/bookings`     | Lịch sử booking của user |
| GET    | `/bookings/:id` | Chi tiết booking         |
| DELETE | `/bookings/:id` | Cancel booking           |

### Payments

| Method | Endpoint                        | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| POST   | `/payments/checkout/:bookingId` | Create Stripe Checkout Session |
| POST   | `/payments/webhook`             | Stripe webhook (no auth)       |
| POST   | `/payments/refund/:bookingId`   | Refund booking                 |

## Project Structure

```
src/
├── auth/                 # Clerk JWT guard, webhook sync
├── users/                # User module
├── services/             # Service module
├── slots/                # Slot CRUD
├── bookings/             # Core booking logic + Redlock
├── payments/             # Stripe checkout + webhook
├── queue/                # BullMQ workers (email, reminder)
├── email/                # Resend email templates
├── cron/                 # Expired booking cleanup
├── cache/                # Redis caching helpers
└── common/               # Guards, interceptors, filters
prisma/
└── schema.prisma
docker-compose.yml
```

---

## Running Tests

```bash
# Unit tests
npm run test

# Integration tests (requires running DB + Redis)
npm run test:e2e

# Race condition test — 50 concurrent requests to same slot
npm run test:race
```
