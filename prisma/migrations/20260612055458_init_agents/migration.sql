-- CreateEnum
CREATE TYPE "agent_status" AS ENUM ('unknown', 'healthy', 'degraded', 'unhealthy');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systems" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" UUID NOT NULL,
    "system_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "status" "agent_status" NOT NULL,
    "last_heartbeat_at" TIMESTAMP(3),
    "registered_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circuit_breaker_states" (
    "agent_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "fail_count" INTEGER NOT NULL,
    "last_state_change" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circuit_breaker_states_pkey" PRIMARY KEY ("agent_id","name")
);

-- CreateTable
CREATE TABLE "circuit_breaker_transitions" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "cb_name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "fail_count" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circuit_breaker_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "systems_tenant_id_slug_key" ON "systems"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "agents_slug_key" ON "agents"("slug");

-- CreateIndex
CREATE INDEX "circuit_breaker_transitions_agent_id_recorded_at_idx" ON "circuit_breaker_transitions"("agent_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "systems" ADD CONSTRAINT "systems_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circuit_breaker_states" ADD CONSTRAINT "circuit_breaker_states_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circuit_breaker_transitions" ADD CONSTRAINT "circuit_breaker_transitions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
