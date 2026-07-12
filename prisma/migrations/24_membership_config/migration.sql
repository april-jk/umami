CREATE TABLE "membership_config" (
    "id" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "membership_config_pkey" PRIMARY KEY ("id")
);
