# E2E Fixtures

Use `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` for authenticated scenarios.
Use `E2E_WORKSPACE_SLUG` for public order scenarios.
Use `E2E_PUBLIC_PROJECT_TOKEN` for customer portal scenarios.
Set `E2E_ALLOW_MUTATION=true` only against preview or staging data.
Do not point mutating E2E tests at production data.
