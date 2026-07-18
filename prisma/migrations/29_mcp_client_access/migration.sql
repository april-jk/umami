BEGIN;

ALTER TABLE "api_key" ADD COLUMN "client_type" VARCHAR(32);

CREATE TABLE "mcp_client_access" (
    "mcp_client_access_id" UUID NOT NULL,
    "api_key_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "client_name" VARCHAR(64),
    "client_version" VARCHAR(64),
    "protocol_version" VARCHAR(32),
    "user_agent" VARCHAR(200),
    "ip_hash_day" VARCHAR(128),
    "route" VARCHAR(200) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "outcome" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_client_access_pkey" PRIMARY KEY ("mcp_client_access_id"),
    CONSTRAINT "mcp_client_access_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_key"("api_key_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mcp_client_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "mcp_client_access_api_key_id_created_at_idx" ON "mcp_client_access"("api_key_id", "created_at");
CREATE INDEX "mcp_client_access_user_id_created_at_idx" ON "mcp_client_access"("user_id", "created_at");
CREATE INDEX "mcp_client_access_tenant_id_created_at_idx" ON "mcp_client_access"("tenant_id", "created_at");
CREATE INDEX "mcp_client_access_created_at_idx" ON "mcp_client_access"("created_at");

COMMIT;
