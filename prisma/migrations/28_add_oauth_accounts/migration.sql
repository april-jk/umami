BEGIN;

CREATE TABLE "oauth_account" (
    "oauth_account_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "oauth_account_pkey" PRIMARY KEY ("oauth_account_id"),
    CONSTRAINT "oauth_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "oauth_account_provider_provider_account_id_key"
    ON "oauth_account"("provider", "provider_account_id");
CREATE INDEX "oauth_account_user_id_idx" ON "oauth_account"("user_id");

COMMIT;
