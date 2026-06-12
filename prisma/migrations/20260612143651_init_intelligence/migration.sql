-- CreateTable
CREATE TABLE "health_score_history" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "classification" TEXT NOT NULL,
    "error_rate" DOUBLE PRECISION NOT NULL,
    "avg_latency_ms" INTEGER NOT NULL,
    "heartbeat_age_s" INTEGER NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_snapshots" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_traces" INTEGER NOT NULL,
    "error_count" INTEGER NOT NULL,
    "avg_latency_ms" INTEGER NOT NULL,
    "p95_latency_ms" INTEGER NOT NULL,
    "total_cost_usd" DECIMAL(12,4) NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_score_history_agent_id_calculated_at_idx" ON "health_score_history"("agent_id", "calculated_at");

-- CreateIndex
CREATE INDEX "agent_snapshots_agent_id_calculated_at_idx" ON "agent_snapshots"("agent_id", "calculated_at");

-- AddForeignKey
ALTER TABLE "health_score_history" ADD CONSTRAINT "health_score_history_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_snapshots" ADD CONSTRAINT "agent_snapshots_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
