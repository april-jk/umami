# Local development environment

This branch uses a dedicated local PostgreSQL database for Umami SaaS work.
Do not reuse databases from other projects.

Required:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/umami_saas_dev?sslmode=disable
APP_SECRET=local-umami-saas-dev-secret
```

Optional:

```bash
REDIS_URL=redis://127.0.0.1:6379
```

Notes:

- `DATABASE_URL` is the only hard requirement for the open-source dev server.
- `APP_SECRET` should be stable for a local database so auth cookies remain valid between restarts.
- `REDIS_URL` enables Umami's Redis client when Redis is available. It is not required unless a feature explicitly depends on cache or rate-limit storage.
- `CLOUD_URL` should stay unset for local open-source development. If `CLOUD_URL` is set, Umami also requires `CLICKHOUSE_URL` and `REDIS_URL`.

Bootstrap:

```bash
createdb -h 127.0.0.1 -U postgres umami_saas_dev
pnpm exec prisma migrate deploy
pnpm dev -- -p 3001
```
