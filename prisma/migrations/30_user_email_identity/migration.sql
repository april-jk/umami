BEGIN;

ALTER TABLE "user" ADD COLUMN "email" VARCHAR(255);

-- Preserve legacy password accounts that already used an email as their username.
-- Ambiguous case-insensitive duplicates are intentionally left NULL for manual remediation.
WITH normalized_email AS (
    SELECT
        "user_id",
        LOWER("username") AS "email",
        COUNT(*) OVER (PARTITION BY LOWER("username")) AS "email_count"
    FROM "user"
    WHERE "username" ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$'
)
UPDATE "user" AS u
SET "email" = normalized_email."email"
FROM normalized_email
WHERE u."user_id" = normalized_email."user_id"
  AND normalized_email."email_count" = 1;

CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "user_email_lower_key" ON "user"(LOWER("email")) WHERE "email" IS NOT NULL;

COMMIT;
