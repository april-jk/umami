BEGIN;

-- This additive migration deliberately retains email data during an application
-- rollback. Reverting application code is safe; dropping this column is not,
-- because it would discard newly verified identity data.

COMMIT;
