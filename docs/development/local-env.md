# Local development environment

This branch uses a dedicated local PostgreSQL database for Amami SaaS work.
Do not reuse databases from other projects.

Required:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/umami_saas_dev?sslmode=disable
APP_SECRET=local-umami-saas-dev-secret
```

Optional:

```bash
REDIS_URL=redis://127.0.0.1:6379

# OAuth callbacks must exactly match these URLs in Google Cloud and GitHub OAuth Apps.
OAUTH_BASE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

Notes:

- `DATABASE_URL` is the only hard requirement for the open-source dev server.
- `APP_SECRET` should be stable for a local database so auth cookies remain valid between restarts.
- `REDIS_URL` enables Amami's Redis client when Redis is available. It is not required unless a feature explicitly depends on cache or rate-limit storage.
- Google callback: `${OAUTH_BASE_URL}/api/auth/oauth/google/callback`.
- GitHub callback: `${OAUTH_BASE_URL}/api/auth/oauth/github/callback`.
- OAuth links require verified provider email addresses. Existing password accounts with that email must enter their current password to explicitly confirm the binding; an OAuth callback never links by email alone.
- OAuth sign-in requires Redis because the browser receives only a one-time, 60-second login code. The bearer token never appears in a URL.
- `CLOUD_URL` should stay unset for local development. If `CLOUD_URL` is set, Amami also requires `CLICKHOUSE_URL` and `REDIS_URL`.

Bootstrap:

```bash
createdb -h 127.0.0.1 -U postgres umami_saas_dev
pnpm exec prisma migrate deploy
pnpm dev -- -p 3001
```
