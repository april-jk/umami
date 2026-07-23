BEGIN;

CREATE TABLE "mcp_usage_counter" (
    "mcp_usage_counter_id" UUID NOT NULL,
    "scope_key" VARCHAR(100) NOT NULL,
    "period" VARCHAR(10) NOT NULL,
    "period_start" DATE NOT NULL,
    "call_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "mcp_usage_counter_pkey" PRIMARY KEY ("mcp_usage_counter_id")
);

CREATE UNIQUE INDEX "mcp_usage_counter_scope_key_period_period_start_key"
  ON "mcp_usage_counter"("scope_key", "period", "period_start");
CREATE INDEX "mcp_usage_counter_scope_key_period_start_idx"
  ON "mcp_usage_counter"("scope_key", "period_start");

COMMIT;
