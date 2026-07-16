# Iteration 11: Google and GitHub OAuth sign-in

## Unit-test coverage

Covered by unit tests:

- OAuth provider configuration and signed, provider-bound state validation.
- Google and GitHub identity parsing, including verified-email requirements.
- Authorization redirect, callback validation, account lookup/creation handoff, and local session redirect.

## Uncovered scenarios

| Scenario | Why it is not unit-tested | Manual verification |
| --- | --- | --- |
| Google consent and callback | Requires a real Google account and registered callback URL. | Sign in at `/login` with Google; confirm redirect to `/dashboard` and a new `oauth_account` record. |
| GitHub consent and callback | Requires a real GitHub account and registered callback URL. | Sign in at `/login` with GitHub; confirm redirect to `/dashboard` and a new `oauth_account` record. |
| Existing email account linking | Requires checking a real identity-provider verified email against a pre-existing local user. | Create a password account with the provider email, then use the provider button and verify the same dashboard data is shown. |
| Provider failure pages | External provider availability and user consent cancellation cannot be deterministically simulated in unit tests. | Cancel consent and temporarily use an invalid secret in a disposable local environment; confirm the user returns to `/login` without provider details being exposed. |

## Suggested follow-up tests

- Add Playwright tests using provider test tenants or a local OAuth mock server.
- Add an integration test against a disposable PostgreSQL database for concurrent provider-account creation.

## Completion checklist

- [x] State parameter is signed and verified against an HttpOnly, SameSite cookie.
- [x] Only verified provider emails can authenticate.
- [x] Provider access tokens are not persisted.
- [x] Migration and rollback scripts are present.
- [ ] Complete Google and GitHub browser sign-in with locally registered callback URLs.
