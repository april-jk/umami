BEGIN;

ALTER TABLE "website" DROP COLUMN IF EXISTS "creation_source";

COMMIT;
