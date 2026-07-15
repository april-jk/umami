CREATE TABLE "activation_code" (
    "activation_code_id" UUID NOT NULL,
    "code_hash" VARCHAR(128) NOT NULL,
    "code_prefix" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120),
    "note" VARCHAR(500),
    "plan" VARCHAR(50) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "max_redemptions" INTEGER NOT NULL,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "activation_code_pkey" PRIMARY KEY ("activation_code_id")
);

CREATE UNIQUE INDEX "activation_code_code_hash_key" ON "activation_code"("code_hash");
CREATE INDEX "activation_code_status_idx" ON "activation_code"("status");
CREATE INDEX "activation_code_starts_at_idx" ON "activation_code"("starts_at");
CREATE INDEX "activation_code_expires_at_idx" ON "activation_code"("expires_at");
CREATE INDEX "activation_code_created_at_idx" ON "activation_code"("created_at");
CREATE INDEX "activation_code_created_by_idx" ON "activation_code"("created_by");

CREATE TABLE "activation_code_redemption" (
    "activation_code_redemption_id" UUID NOT NULL,
    "activation_code_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan" VARCHAR(50) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "redeemed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "membership_starts_at" TIMESTAMPTZ(6) NOT NULL,
    "membership_ends_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "activation_code_redemption_pkey" PRIMARY KEY ("activation_code_redemption_id")
);

CREATE UNIQUE INDEX "activation_code_redemption_code_user_key"
  ON "activation_code_redemption"("activation_code_id", "user_id");
CREATE INDEX "activation_code_redemption_user_id_idx" ON "activation_code_redemption"("user_id");
CREATE INDEX "activation_code_redemption_tenant_id_idx" ON "activation_code_redemption"("tenant_id");
CREATE INDEX "activation_code_redemption_redeemed_at_idx" ON "activation_code_redemption"("redeemed_at");
