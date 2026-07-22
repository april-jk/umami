# Contributing to Amami

Thank you for contributing to Amami. Keep each change focused and include tests for behavior that changes.

## Branching

Create feature and fix branches from `master`. Pull requests should target `master` unless a maintainer names a release branch for the change.

```bash
git switch master
git pull --ff-only origin master
git switch -c my-feature
```

## Pull requests

1. Keep the diff limited to one logical change.
2. Add or update targeted tests.
3. Run the relevant quality checks:

   ```bash
   pnpm vitest run path/to/relevant.test.ts
   pnpm lint
   pnpm exec tsc --noEmit
   ```

4. Push the branch and open a pull request against `master`.
5. Explain the user impact, verification evidence, migration needs, and remaining risk.

## Issues

Search [existing issues](https://github.com/april-jk/umami/issues) before opening a new one. Bug reports should include reproduction steps, expected and actual behavior, Amami version, database, deployment method, and browser when relevant.

## Development setup

See [README.md](./README.md) for installation and local development instructions.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
