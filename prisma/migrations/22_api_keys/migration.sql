-- CreateTable
CREATE TABLE "api_key" (
    "api_key_id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "key_hash" VARCHAR(128) NOT NULL,
    "key_prefix" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "api_key_pkey" PRIMARY KEY ("api_key_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_key_key_hash_key" ON "api_key"("key_hash");

-- CreateIndex
CREATE INDEX "api_key_tenant_id_idx" ON "api_key"("tenant_id");

-- CreateIndex
CREATE INDEX "api_key_user_id_idx" ON "api_key"("user_id");

-- CreateIndex
CREATE INDEX "api_key_key_prefix_idx" ON "api_key"("key_prefix");

-- CreateIndex
CREATE INDEX "api_key_created_at_idx" ON "api_key"("created_at");

-- CreateIndex
CREATE INDEX "api_key_last_used_at_idx" ON "api_key"("last_used_at");
