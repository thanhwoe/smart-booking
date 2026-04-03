-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'PROVIDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'FULL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slots" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "booked_count" INTEGER NOT NULL DEFAULT 0,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "stripe_session_id" TEXT,
    "stripe_payment_intent" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "slots_start_time_end_time_idx" ON "slots"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "slots_service_id_start_time_idx" ON "slots"("service_id", "start_time");

-- CreateIndex
CREATE INDEX "slots_provider_id_start_time_idx" ON "slots"("provider_id", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_idempotency_key_key" ON "bookings"("idempotency_key");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_slot_id_status_idx" ON "bookings"("slot_id", "status");

-- CreateIndex
CREATE INDEX "bookings_status_expires_at_idx" ON "bookings"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_session_id_key" ON "payments"("stripe_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_key" ON "payments"("stripe_payment_intent");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_events_stripe_event_id_key" ON "stripe_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "stripe_events_processed_idx" ON "stripe_events"("processed");

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
