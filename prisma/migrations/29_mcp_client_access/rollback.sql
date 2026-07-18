BEGIN;

DROP INDEX IF EXISTS "mcp_client_access_created_at_idx";
DROP INDEX IF EXISTS "mcp_client_access_tenant_id_created_at_idx";
DROP INDEX IF EXISTS "mcp_client_access_user_id_created_at_idx";
DROP INDEX IF EXISTS "mcp_client_access_api_key_id_created_at_idx";
DROP TABLE IF EXISTS "mcp_client_access";

ALTER TABLE "api_key" DROP COLUMN IF EXISTS "client_type";

COMMIT;
