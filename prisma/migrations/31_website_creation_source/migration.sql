BEGIN;

ALTER TABLE "website" ADD COLUMN "creation_source" VARCHAR(16);

UPDATE "website" SET "creation_source" = 'unknown';

ALTER TABLE "website" ALTER COLUMN "creation_source" SET DEFAULT 'web';
ALTER TABLE "website" ALTER COLUMN "creation_source" SET NOT NULL;
ALTER TABLE "website" ADD CONSTRAINT "website_creation_source_check"
    CHECK ("creation_source" IN ('web', 'mcp', 'api', 'unknown'));

COMMIT;
