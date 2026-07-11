-- Retention is a logical delete boundary. Raw events remain available for
-- operational recovery, but analytics queries cannot read data before it.
ALTER TABLE "website" ADD COLUMN "retention_cutoff_at" TIMESTAMPTZ(6);

CREATE INDEX "website_retention_cutoff_at_idx" ON "website"("retention_cutoff_at");
