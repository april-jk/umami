<p align="center">
  <img src="./public/favicon.svg" alt="Amami logo" width="100">
</p>

<h1 align="center">Amami</h1>

<p align="center">
  <i>Privacy-focused web analytics built for teams and AI-assisted workflows.</i>
</p>

<p align="center">
  <a href="https://github.com/april-jk/umami/actions"><img src="https://img.shields.io/github/actions/workflow/status/april-jk/umami/ci.yml" alt="Build status"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>

## Documentation

Product and integration documentation is available at [docs.amami.dev](https://docs.amami.dev/).

## Install from source

Requirements:

- Node.js 22
- pnpm 10
- PostgreSQL 15 or newer

```bash
git clone https://github.com/april-jk/umami.git
cd umami
pnpm install
```

Create an `.env` file with at least a PostgreSQL connection string and an application secret:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/amami
APP_SECRET=replace-me-with-a-random-string
```

Optional: set `API_URL` to change the base URL used by internal UI API calls. Relative paths are served under `BASE_PATH`; absolute URLs are called directly by the browser.

```bash
pnpm build
pnpm start
```

The application listens on `http://localhost:3000` by default.

## Run with Docker Compose

The included Compose file builds the current checkout, so it does not depend on an external application image.

```bash
docker compose up --build -d
```

Review the example credentials in `docker-compose.yml` before exposing the service outside a local environment.

## Development

```bash
pnpm dev
pnpm test
pnpm lint
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the branch and pull request workflow.

## License

Amami is distributed under the [MIT License](./LICENSE). The license file retains the notices required for code inherited from earlier authors.
