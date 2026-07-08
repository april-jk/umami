-- CreateTable
CREATE TABLE "tenant" (
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "plan" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "logo_url" VARCHAR(2183),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "tenant_user" (
    "tenant_user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_user_pkey" PRIMARY KEY ("tenant_user_id")
);

-- CreateTable
CREATE TABLE "tenant_subscription" (
    "tenant_subscription_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "billing_provider" VARCHAR(50),
    "billing_customer_id" VARCHAR(255),
    "billing_subscription_id" VARCHAR(255),
    "current_period_start" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "trial_ends_at" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_subscription_pkey" PRIMARY KEY ("tenant_subscription_id")
);

-- CreateTable
CREATE TABLE "tenant_usage_monthly" (
    "tenant_usage_monthly_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "event_count" BIGINT NOT NULL DEFAULT 0,
    "website_count" INTEGER NOT NULL DEFAULT 0,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "ai_query_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_usage_monthly_pkey" PRIMARY KEY ("tenant_usage_monthly_id")
);

-- AlterTable
ALTER TABLE "user" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "website" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "team" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "link" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "pixel" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "board" ADD COLUMN "tenant_id" UUID;

-- Backfill personal tenants. Use deterministic UUIDs so rerunning failed migrations is predictable.
INSERT INTO "tenant" ("tenant_id", "name", "slug", "type", "plan", "status", "created_at", "updated_at", "deleted_at")
SELECT
    (
      substr(md5('personal-tenant:' || "user_id"::text), 1, 8) || '-' ||
      substr(md5('personal-tenant:' || "user_id"::text), 9, 4) || '-' ||
      substr(md5('personal-tenant:' || "user_id"::text), 13, 4) || '-' ||
      substr(md5('personal-tenant:' || "user_id"::text), 17, 4) || '-' ||
      substr(md5('personal-tenant:' || "user_id"::text), 21, 12)
    )::uuid,
    "username",
    'personal-' || replace("user_id"::text, '-', ''),
    'personal',
    'free',
    CASE WHEN "deleted_at" IS NULL THEN 'active' ELSE 'deleted' END,
    COALESCE("created_at", CURRENT_TIMESTAMP),
    "updated_at",
    "deleted_at"
FROM "user";

-- Backfill team tenants. Existing teams become tenant-scoped collaboration units.
INSERT INTO "tenant" ("tenant_id", "name", "slug", "type", "plan", "status", "logo_url", "created_at", "updated_at", "deleted_at")
SELECT
    (
      substr(md5('team-tenant:' || "team_id"::text), 1, 8) || '-' ||
      substr(md5('team-tenant:' || "team_id"::text), 9, 4) || '-' ||
      substr(md5('team-tenant:' || "team_id"::text), 13, 4) || '-' ||
      substr(md5('team-tenant:' || "team_id"::text), 17, 4) || '-' ||
      substr(md5('team-tenant:' || "team_id"::text), 21, 12)
    )::uuid,
    "name",
    'team-' || replace("team_id"::text, '-', ''),
    'team',
    'free',
    CASE WHEN "deleted_at" IS NULL THEN 'active' ELSE 'deleted' END,
    "logo_url",
    COALESCE("created_at", CURRENT_TIMESTAMP),
    "updated_at",
    "deleted_at"
FROM "team";

UPDATE "user"
SET "tenant_id" = (
  substr(md5('personal-tenant:' || "user_id"::text), 1, 8) || '-' ||
  substr(md5('personal-tenant:' || "user_id"::text), 9, 4) || '-' ||
  substr(md5('personal-tenant:' || "user_id"::text), 13, 4) || '-' ||
  substr(md5('personal-tenant:' || "user_id"::text), 17, 4) || '-' ||
  substr(md5('personal-tenant:' || "user_id"::text), 21, 12)
)::uuid;

UPDATE "team"
SET "tenant_id" = (
  substr(md5('team-tenant:' || "team_id"::text), 1, 8) || '-' ||
  substr(md5('team-tenant:' || "team_id"::text), 9, 4) || '-' ||
  substr(md5('team-tenant:' || "team_id"::text), 13, 4) || '-' ||
  substr(md5('team-tenant:' || "team_id"::text), 17, 4) || '-' ||
  substr(md5('team-tenant:' || "team_id"::text), 21, 12)
)::uuid;

UPDATE "website"
SET "tenant_id" = CASE
  WHEN "team_id" IS NOT NULL THEN (
    substr(md5('team-tenant:' || "team_id"::text), 1, 8) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 9, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 13, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 17, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 21, 12)
  )::uuid
  WHEN "user_id" IS NOT NULL THEN (
    substr(md5('personal-tenant:' || "user_id"::text), 1, 8) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 9, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 13, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 17, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 21, 12)
  )::uuid
END;

UPDATE "link"
SET "tenant_id" = CASE
  WHEN "team_id" IS NOT NULL THEN (
    substr(md5('team-tenant:' || "team_id"::text), 1, 8) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 9, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 13, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 17, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 21, 12)
  )::uuid
  WHEN "user_id" IS NOT NULL THEN (
    substr(md5('personal-tenant:' || "user_id"::text), 1, 8) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 9, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 13, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 17, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 21, 12)
  )::uuid
END;

UPDATE "pixel"
SET "tenant_id" = CASE
  WHEN "team_id" IS NOT NULL THEN (
    substr(md5('team-tenant:' || "team_id"::text), 1, 8) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 9, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 13, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 17, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 21, 12)
  )::uuid
  WHEN "user_id" IS NOT NULL THEN (
    substr(md5('personal-tenant:' || "user_id"::text), 1, 8) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 9, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 13, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 17, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 21, 12)
  )::uuid
END;

UPDATE "board"
SET "tenant_id" = CASE
  WHEN "team_id" IS NOT NULL THEN (
    substr(md5('team-tenant:' || "team_id"::text), 1, 8) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 9, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 13, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 17, 4) || '-' ||
    substr(md5('team-tenant:' || "team_id"::text), 21, 12)
  )::uuid
  WHEN "user_id" IS NOT NULL THEN (
    substr(md5('personal-tenant:' || "user_id"::text), 1, 8) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 9, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 13, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 17, 4) || '-' ||
    substr(md5('personal-tenant:' || "user_id"::text), 21, 12)
  )::uuid
END;

INSERT INTO "tenant_user" ("tenant_user_id", "tenant_id", "user_id", "role", "created_at", "updated_at")
SELECT
    (
      substr(md5('personal-tenant-user:' || "user_id"::text), 1, 8) || '-' ||
      substr(md5('personal-tenant-user:' || "user_id"::text), 9, 4) || '-' ||
      substr(md5('personal-tenant-user:' || "user_id"::text), 13, 4) || '-' ||
      substr(md5('personal-tenant-user:' || "user_id"::text), 17, 4) || '-' ||
      substr(md5('personal-tenant-user:' || "user_id"::text), 21, 12)
    )::uuid,
    "tenant_id",
    "user_id",
    'tenant-owner',
    COALESCE("created_at", CURRENT_TIMESTAMP),
    "updated_at"
FROM "user"
WHERE "tenant_id" IS NOT NULL;

INSERT INTO "tenant_user" ("tenant_user_id", "tenant_id", "user_id", "role", "created_at", "updated_at")
SELECT DISTINCT ON ("team"."tenant_id", "team_user"."user_id")
    (
      substr(md5('team-tenant-user:' || "team_user"."team_id"::text || ':' || "team_user"."user_id"::text), 1, 8) || '-' ||
      substr(md5('team-tenant-user:' || "team_user"."team_id"::text || ':' || "team_user"."user_id"::text), 9, 4) || '-' ||
      substr(md5('team-tenant-user:' || "team_user"."team_id"::text || ':' || "team_user"."user_id"::text), 13, 4) || '-' ||
      substr(md5('team-tenant-user:' || "team_user"."team_id"::text || ':' || "team_user"."user_id"::text), 17, 4) || '-' ||
      substr(md5('team-tenant-user:' || "team_user"."team_id"::text || ':' || "team_user"."user_id"::text), 21, 12)
    )::uuid,
    "team"."tenant_id",
    "team_user"."user_id",
    CASE "team_user"."role"
      WHEN 'team-owner' THEN 'tenant-owner'
      WHEN 'team-manager' THEN 'tenant-admin'
      WHEN 'team-member' THEN 'tenant-member'
      ELSE 'tenant-viewer'
    END,
    COALESCE("team_user"."created_at", CURRENT_TIMESTAMP),
    "team_user"."updated_at"
FROM "team_user"
JOIN "team" ON "team"."team_id" = "team_user"."team_id"
WHERE "team"."tenant_id" IS NOT NULL;

INSERT INTO "tenant_subscription" ("tenant_subscription_id", "tenant_id", "plan", "status", "created_at")
SELECT
    (
      substr(md5('tenant-subscription:' || "tenant_id"::text), 1, 8) || '-' ||
      substr(md5('tenant-subscription:' || "tenant_id"::text), 9, 4) || '-' ||
      substr(md5('tenant-subscription:' || "tenant_id"::text), 13, 4) || '-' ||
      substr(md5('tenant-subscription:' || "tenant_id"::text), 17, 4) || '-' ||
      substr(md5('tenant-subscription:' || "tenant_id"::text), 21, 12)
    )::uuid,
    "tenant_id",
    "plan",
    'active',
    CURRENT_TIMESTAMP
FROM "tenant";

INSERT INTO "tenant_usage_monthly" (
    "tenant_usage_monthly_id",
    "tenant_id",
    "month",
    "website_count",
    "member_count",
    "created_at"
)
SELECT
    (
      substr(md5('tenant-usage:' || "tenant"."tenant_id"::text || ':' || date_trunc('month', CURRENT_DATE)::date::text), 1, 8) || '-' ||
      substr(md5('tenant-usage:' || "tenant"."tenant_id"::text || ':' || date_trunc('month', CURRENT_DATE)::date::text), 9, 4) || '-' ||
      substr(md5('tenant-usage:' || "tenant"."tenant_id"::text || ':' || date_trunc('month', CURRENT_DATE)::date::text), 13, 4) || '-' ||
      substr(md5('tenant-usage:' || "tenant"."tenant_id"::text || ':' || date_trunc('month', CURRENT_DATE)::date::text), 17, 4) || '-' ||
      substr(md5('tenant-usage:' || "tenant"."tenant_id"::text || ':' || date_trunc('month', CURRENT_DATE)::date::text), 21, 12)
    )::uuid,
    "tenant"."tenant_id",
    date_trunc('month', CURRENT_DATE)::date,
    COALESCE("website_counts"."count", 0),
    COALESCE("member_counts"."count", 0),
    CURRENT_TIMESTAMP
FROM "tenant"
LEFT JOIN (
    SELECT "tenant_id", count(*)::int AS "count"
    FROM "website"
    WHERE "tenant_id" IS NOT NULL AND "deleted_at" IS NULL
    GROUP BY "tenant_id"
) AS "website_counts" ON "website_counts"."tenant_id" = "tenant"."tenant_id"
LEFT JOIN (
    SELECT "tenant_id", count(*)::int AS "count"
    FROM "tenant_user"
    GROUP BY "tenant_id"
) AS "member_counts" ON "member_counts"."tenant_id" = "tenant"."tenant_id";

-- CreateIndex
CREATE UNIQUE INDEX "tenant_slug_key" ON "tenant"("slug");
CREATE INDEX "tenant_slug_idx" ON "tenant"("slug");
CREATE INDEX "tenant_type_idx" ON "tenant"("type");
CREATE INDEX "tenant_plan_idx" ON "tenant"("plan");
CREATE INDEX "tenant_status_idx" ON "tenant"("status");
CREATE INDEX "tenant_created_at_idx" ON "tenant"("created_at");
CREATE UNIQUE INDEX "tenant_user_tenant_id_user_id_key" ON "tenant_user"("tenant_id", "user_id");
CREATE INDEX "tenant_user_tenant_id_idx" ON "tenant_user"("tenant_id");
CREATE INDEX "tenant_user_user_id_idx" ON "tenant_user"("user_id");
CREATE INDEX "tenant_user_role_idx" ON "tenant_user"("role");
CREATE UNIQUE INDEX "tenant_subscription_tenant_id_key" ON "tenant_subscription"("tenant_id");
CREATE INDEX "tenant_subscription_plan_idx" ON "tenant_subscription"("plan");
CREATE INDEX "tenant_subscription_status_idx" ON "tenant_subscription"("status");
CREATE INDEX "tenant_subscription_billing_customer_id_idx" ON "tenant_subscription"("billing_customer_id");
CREATE INDEX "tenant_subscription_billing_subscription_id_idx" ON "tenant_subscription"("billing_subscription_id");
CREATE UNIQUE INDEX "tenant_usage_monthly_tenant_id_month_key" ON "tenant_usage_monthly"("tenant_id", "month");
CREATE INDEX "tenant_usage_monthly_tenant_id_idx" ON "tenant_usage_monthly"("tenant_id");
CREATE INDEX "tenant_usage_monthly_month_idx" ON "tenant_usage_monthly"("month");
CREATE INDEX "user_tenant_id_idx" ON "user"("tenant_id");
CREATE INDEX "website_tenant_id_idx" ON "website"("tenant_id");
CREATE INDEX "team_tenant_id_idx" ON "team"("tenant_id");
CREATE INDEX "link_tenant_id_idx" ON "link"("tenant_id");
CREATE INDEX "pixel_tenant_id_idx" ON "pixel"("tenant_id");
CREATE INDEX "board_tenant_id_idx" ON "board"("tenant_id");
