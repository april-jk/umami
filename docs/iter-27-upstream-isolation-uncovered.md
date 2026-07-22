# Iteration 27: Upstream isolation uncovered scenarios

## Scope

This iteration removes runtime requests, release targets, container images, repository links, and update copy that connected Amami to the original Umami project infrastructure.

## Scenarios not covered by unit tests

1. **Production environment variables**
   - `API_URL`, `TRACKER_SCRIPT_URL`, and `CLOUD_URL` remain configurable integration points; startup now rejects the original project's domain family.
   - Repository tests cannot inspect Railway environment values or ignored local `.env` files.
   - Production must still confirm non-empty values use the intended Amami-owned domains.

2. **GitHub Actions publishing**
   - Workflow YAML is parsed locally, but this iteration does not create a release tag or push an image.
   - GHCR permissions, multi-architecture builders, and repository package settings require a real workflow run.

3. **Docker and Podman runtime builds**
   - Compose files now build the current checkout instead of pulling an upstream image.
   - A full multi-platform container build and persistent-volume upgrade rehearsal were not run.

4. **Third-party UI package**
   - `@umami/react-zen` remains a pinned MIT dependency used throughout the UI.
   - Removing this supply-chain dependency requires a separate fork or workspace migration with visual, accessibility, and interaction regression coverage.

5. **Legacy compatibility identifiers**
   - `window.umami`, `data-umami-*`, `x-umami-*`, `UMAMI_*`, and `umami.*` storage keys remain for existing tracker and deployment compatibility.
   - Renaming them requires a dual-read/dual-write deprecation period and is intentionally outside this isolation pass.

6. **Turbopack production build**
   - `next build --turbo` entered a sleeping compile state with no active child compiler and was stopped after five minutes.
   - `next build --webpack` completed successfully; the Turbopack stall remains a toolchain-specific follow-up.

## Completed automated verification

- Five targeted test files, 21 tests passed.
- App, config API, and proxy statement coverage: 100% each.
- Static repository test rejects upstream domains, repository organization links, and the original Docker Hub image identity outside the legally required `LICENSE` notice.
- TypeScript, targeted Biome checks, YAML parsing, JSON parsing, frozen lockfile installation, and Webpack production build passed.

## Manual verification steps

1. Inspect Railway production variables and confirm `CLOUD_URL` and `TRACKER_SCRIPT_URL` do not reference upstream infrastructure.
2. Deploy a staging instance and verify browser network logs contain no request to the original project's domain family while logging in, navigating, and loading tracker code.
3. Run `docker compose up --build -d`, create analytics data, restart the stack, and confirm data persists.
4. Trigger the GHCR workflow with a non-production test tag and verify all tags stay under the current repository namespace.
5. Re-run the Turbopack build after upgrading or isolating the Next/Turbopack toolchain.

## Checklist

- [x] Upstream update check removed
- [x] Browser and build telemetry removed
- [x] Upstream tracker rewrite removed
- [x] Upstream container and release targets removed
- [x] Static isolation regression test added
- [ ] Railway environment audited
- [ ] Staging browser network trace captured
- [ ] Container persistence rehearsal completed
- [ ] `@umami/react-zen` fork/workspace migration completed
