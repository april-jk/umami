# MCP Client Access Control and Update Protocol

> Status: proposed implementation contract
>
> Date: 2026-07-18
>
> Owner: Amami server and Amami Analytics MCP maintainers

## Decision

Amami records authenticated MCP access separately from public website analytics. An API key issued by the browser-mediated MCP authorization flow identifies the account and installation. Client headers provide operational evidence only; they never authenticate a request and cannot by themselves bypass bot protection.

The protocol has two independent paths:

1. Public website collection (`POST /api/send`) remains anonymous and bot-filtered.
2. Authenticated MCP API access (`/api/*` with an API key) records the client identity, protocol version, capability result, and a privacy-limited network fingerprint.

Do not store MCP access records in `website_event`. Website visitors and MCP users have different purposes, legal bases, retention needs, and access controls.

## Existing Baseline

- Browser MCP authorization creates a dedicated API key through PKCE: `POST /api/auth/mcp/authorize` and `POST /api/auth/mcp/exchange`.
- The authenticated request context already exposes `user` and `apiKeyId`.
- API key records already maintain `lastUsedAt`.
- Public collection rejects bot user agents and returns `{"beep":"boop"}` without persisting an event.
- The MCP package identifies itself as `amami-analytics-mcp/<version>` in its User-Agent.

## Trust Model

| Signal | Purpose | Trusted for identity? | Notes |
| --- | --- | --- | --- |
| API key hash / `apiKeyId` | Installation and account identity | Yes | Server resolves it from the bearer token. Never store the raw key in logs. |
| Authenticated user and tenant | Authorization and ownership | Yes | Derived from the API key, never from a request header. |
| `User-Agent` | Transport diagnostic and bot analysis | No | Preserve a bounded, sanitized value only for authenticated MCP access. |
| `X-Amami-MCP-Client` | Declared package name/version | No | Syntax-validated client telemetry; may be forged. |
| `X-Amami-MCP-Protocol` | Declared protocol revision | No | Supports compatibility messaging; may be forged. |
| IP address | Abuse investigation and rate limiting | No | Store only a keyed daily hash in the access log; never use it as an account identifier. |

## Client Request Contract

Every MCP API request must send:

```http
Authorization: Bearer <installation-api-key>
User-Agent: amami-analytics-mcp/0.1.3
X-Amami-MCP-Client: amami-analytics-mcp/0.1.3
X-Amami-MCP-Protocol: 2026-07-18
```

Requirements:

- `User-Agent` and `X-Amami-MCP-Client` are capped at 200 characters and must be sanitized before persistence.
- The client name must match `^[a-z0-9][a-z0-9._-]{0,63}$`; version must be a valid SemVer value.
- Missing or malformed client headers do not reject valid requests during the migration period. They are recorded as `unknown` and receive no automatic update recommendation.
- Headers never change the authenticated user, tenant, permission scope, or API key identity.
- API keys remain revocable per installation. A revoked key cannot report telemetry or receive a compatibility exemption.

## Server Access Record

Create a new `mcp_client_access` table, distinct from website analytics events.

| Field | Source | Retention | Purpose |
| --- | --- | --- | --- |
| `mcp_client_access_id` | Server UUID | 90 days | Record identity. |
| `api_key_id`, `user_id`, `tenant_id` | Auth context | 90 days | Installation/account association. |
| `client_name`, `client_version`, `protocol_version` | Validated headers | 90 days | Compatibility and update targeting. |
| `user_agent` | Sanitized header | 30 days | Diagnosing compatibility and false bot detections. |
| `ip_hash_day` | `HMAC(server_secret, yyyy-mm-dd + normalized_ip)` | 30 days | Rate limiting and abuse correlation without retaining raw IP. |
| `route`, `method`, `status_code`, `outcome` | Server request/response | 90 days | Reliability and update rollouts. |
| `created_at` | Server | 90 days | Retention and time series. |

`outcome` is one of `success`, `unauthorized`, `forbidden`, `rate_limited`, `client_outdated`, `invalid_client_metadata`, or `server_error`. Do not log URL query strings, authorization values, request bodies, API keys, user prompts, analytics query results, email addresses, or other personal content.

Write access records asynchronously or best-effort after authorization. Logging failure must not make a valid analytics read request fail. Authorization failure records must contain no raw bearer token and no claimed user identity.

## Version Policy and Update Delivery

The server publishes a small, versioned policy document in configuration, not hard-coded per endpoint:

```json
{
  "latestVersion": "0.1.4",
  "minimumSupportedVersion": "0.1.2",
  "protocolVersion": "2026-07-18",
  "message": "Upgrade Amami Analytics MCP for collection-verification fixes.",
  "docsUrl": "https://docs.amami.dev/docs/mcp-config/"
}
```

For an authenticated request with valid client metadata:

- Server adds `X-Amami-MCP-Latest-Version` when a newer version exists.
- Server adds `X-Amami-MCP-Minimum-Version` when the client is below the supported floor.
- The response body may include a non-blocking `clientUpdate` object for MCP clients that consume JSON results.
- Below the minimum version: read requests return `426 Upgrade Required` only after a published deprecation window. Write requests can be blocked earlier only for an active security issue, with an incident record and an explicit user-facing message.
- The MCP package displays the recommendation on stderr and exposes it through a read-only `get_client_update_status` tool. It must never auto-update a user installation.

## Bot and Collection Policy

| Request class | Authentication | Bot treatment | Expected use |
| --- | --- | --- | --- |
| Browser tracking script -> `/api/send` | None | `isbot` remains enabled | Real visitor pageviews/events. |
| MCP -> `/api/*` | Installation API key | No browser-bot gate; use authenticated rate limits and access logs | Analytics management and queries. |
| MCP synthetic collection test | Not supported through anonymous `/api/send` | Must surface `bot_filtered`, not fake a browser | Browser E2E test or future authenticated server ingestion. |
| Future server ingestion endpoint | API key plus scoped signature | Dedicated allowlist/rate limit; not a Cloudflare UA bypass | Explicitly approved backend events only. |

Cloudflare should continue to protect public endpoints. Do not add a global Cloudflare bypass for MCP User-Agents or for `/api/send`. If Cloudflare ever blocks a valid authenticated `/api/*` request, scope a rule to the authenticated API route and verified service behavior, never to a spoofable UA alone.

## Rollout

1. Add database migration, Prisma model, writer, retention sweep, and tests for `mcp_client_access`.
2. Add the client metadata headers in the MCP package and version-policy parsing.
3. Start in observation mode: store headers and return update hints without blocking clients.
4. Publish the retention statement and the supported-version policy in docs.
5. After at least one release cycle, set a minimum supported version and announce the deprecation date.
6. Add a separate authenticated server-ingestion design only when there is a verified non-browser event use case.

## Responsibilities

| Owner | Required work |
| --- | --- |
| Server implementation | Migration; model; sanitized/best-effort access writer; keyed IP hashing; 30/90 day cleanup; authenticated rate limits; policy response headers; tests. |
| MCP package | Send declared client/protocol headers; parse update response; present update status without auto-update; preserve explicit write opt-in; tests. |
| Product/Operations | Approve the 30/90 day retention windows, privacy notice language, minimum-supported-version/deprecation policy, and the destination for update documentation. |
| Infrastructure | Confirm Railway has a stable `APP_SECRET`; schedule the cleanup job; monitor access-log growth; do not add a Cloudflare bypass unless real edge evidence shows an authenticated API route is blocked. |

## Acceptance Criteria

- A revoked API key generates no successful access log and gains no update information.
- A valid MCP API key logs its installation ID, validated client version, bounded UA, daily IP hash, route category, status, and outcome without credentials or request data.
- A spoofed UA cannot authorize a request or bypass collection bot filtering.
- An older but supported MCP receives an update hint; an unsupported one receives a documented upgrade response after the announced grace period.
- Public browser collection remains bot-filtered and does not create MCP access records.
- Retention cleanup deletes raw UA and IP hashes after 30 days, then removes the remaining access record after 90 days.
