# Contributing

## Setup

1. Install dependencies: `pnpm install`
2. Configure OAuth for local development (`.env.local` or Settings override)
3. Run lint: `pnpm run lint`
4. Run format check: `pnpm run format:check`
5. Run checks: `pnpm run check`
6. Run tests: `pnpm run test:run`
7. Build before PR: `pnpm run build`

## Pull requests

- Keep changes scoped and atomic.
- Include a clear description of behavior changes.
- Update docs when auth, privacy, or user flows change.
- Do not commit secrets, tokens, or generated credentials.

## Code quality

- TypeScript must pass with `strict` settings.
- Prefer small composable modules over large monolith changes.
- Add or update tests when introducing logic changes.
- Follow `CODE_OF_CONDUCT.md`.

## Security and privacy expectations

- Do not expose raw auth tokens to content scripts.
- Keep OAuth flows state-validated and PKCE-based.
- Keep dual OAuth modes intact: bundled release client ID and local Settings override.
- Be explicit about any newly captured user data.
