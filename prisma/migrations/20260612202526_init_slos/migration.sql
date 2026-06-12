-- CreateTable
CREATE TABLE "slo_definitions" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "metric" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "threshold" DECIMAL(20,6) NOT NULL,
    "window_hours" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slo_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slo_evaluations" (
    "id" UUID NOT NULL,
    "slo_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "measured_value" DECIMAL(20,6),
    "breach" BOOLEAN NOT NULL,
    "langfuse_trace_ref" TEXT,
    "evaluated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slo_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slo_definitions_agent_id_idx" ON "slo_definitions"("agent_id");

-- CreateIndex
CREATE INDEX "slo_evaluations_slo_id_evaluated_at_idx" ON "slo_evaluations"("slo_id", "evaluated_at");

-- AddForeignKey
ALTER TABLE "slo_definitions" ADD CONSTRAINT "slo_definitions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slo_evaluations" ADD CONSTRAINT "slo_evaluations_slo_id_fkey" FOREIGN KEY ("slo_id") REFERENCES "slo_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slo_evaluations" ADD CONSTRAINT "slo_evaluations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
