# Notis Extension

Notis is a Chrome extension for collecting visual feedback on web pages and creating Linear issues with annotated screenshots.

## Current status

This project is pre-1.0 and intended for staging-review workflows.

## Distribution channels

- Official channel: GitHub Releases (`notis-extension-<version>.zip`) published from tagged builds.
- Self-host channel: local unpacked build from source.

## Features

- Element picker with hover highlight
- Draft note queue with marker overlays
- Grouped submission to one Linear issue
- Screenshot capture with marker overlays
- Browser-action popup and options pages for Linear workspace configuration
- OAuth connection flow for Linear (Authorization Code + PKCE)

## Security and privacy

- OAuth is the default auth flow.
- API token fallback is disabled by default and can be temporarily enabled with `VITE_ALLOW_LINEAR_PAT_FALLBACK=true`.
- Access tokens are stored in extension storage and refreshed when available.
- Content scripts receive only redacted auth state (not raw tokens).
- Captured URL is sanitized to origin only.
- Grouped submission captures a bounded region around selected notes by default.
- Sensitive fields can be redacted in captures (enabled by default, configurable in Settings).
- Inline image payloads are size-limited before sending to Linear.

See `PRIVACY.md` for data handling details, retention expectations, and user controls.

## Install (official channel)

### 1) Download release artifact

- Download the latest `notis-extension-<version>.zip` from GitHub Releases.
- Unzip it.

### 2) Load in Chrome

- Open `chrome://extensions`
- Enable Developer mode
- Click **Load unpacked**
- Select the unzipped folder that contains `manifest.json`

### 3) Connect Linear

- Open extension **Settings**
- Click **Connect with OAuth**
- Complete authorization

### 4) Grant site access when prompted

- Click **Activate** from the popup on the page you want to annotate.
- Approve site access for that site origin.
- You can review/revoke granted sites in extension **Settings**.

## OAuth modes

### Official mode (default for release artifacts)

- OAuth client ID is bundled at build/release time.
- End users do not need to create a Linear OAuth app.

### Self-host mode (for contributors/private forks)

- Open extension **Settings**.
- Copy the displayed redirect URI (`https://<extension-id>.chromiumapp.org/linear`).
- Create/configure your Linear OAuth app with that redirect URI.
- Save your OAuth client ID in **Settings** under `OAuth client ID override`.

## Development setup

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure environment (optional for local dev)

Create `.env.local` if you want a bundled default OAuth client ID in local builds:

```bash
VITE_LINEAR_OAUTH_CLIENT_ID=your_linear_oauth_client_id
# Optional emergency fallback. Keep unset/false for OAuth-only mode.
# VITE_ALLOW_LINEAR_PAT_FALLBACK=true
```

If `VITE_LINEAR_OAUTH_CLIENT_ID` is not set, you can still connect by saving an `OAuth client ID override` in extension Settings.

### 3) Build

```bash
pnpm run build
```

### 4) Load extension in Chrome

- Open `chrome://extensions`
- Enable Developer mode
- Click **Load unpacked**
- Select the `dist` directory created by `pnpm run build`

## Packaging release zip

```bash
pnpm run build
pnpm run package
```

This writes `notis-extension-<version>.zip` in the project root.

## Scripts

- `pnpm run dev` - Vite dev mode
- `pnpm run check` - TypeScript check
- `pnpm run lint` - ESLint
- `pnpm run format:check` - Prettier validation
- `pnpm run test` - Run tests in watch mode
- `pnpm run test:run` - Run tests once
- `pnpm run build` - TypeScript check + production build
- `pnpm run package` - Zip `dist` for release distribution

## Architecture

- `src/content` - In-page toolbar, picker, annotator, markers
- `src/background` - Auth, Linear API, screenshots, messaging
- `src/popup` - Quick actions and settings access
- `src/options` - Full settings UI
- `src/shared` - Shared types/messages/runtime helpers

## Permission scope

- Required host permissions: `https://api.linear.app/*`, `https://linear.app/*` (Linear API + OAuth)
- Site access model:
  - Local development sites (`http://localhost/*`, `http://127.0.0.1/*`) are available by default.
  - Other sites require explicit per-site permission at activation time.
  - Granted sites can be reviewed/revoked in Settings.
- Data minimization safeguards:
  - No automatic issue submission; user action is required.
  - URL metadata is reduced to origin.
  - Content scripts receive redacted auth state only.
  - Captures are sent to Linear only when a user submits feedback.
  - Screenshot redaction defaults to enabled for likely sensitive fields.

## Release readiness checks

- CI verifies lint, format, typecheck, unit tests, and build on pushes/PRs.
- Security automation includes Dependabot, CodeQL analysis, and scheduled dependency audit.
- Site access is explicit per origin, with grant/revoke controls in Settings.
- Screenshot redaction is enabled by default for likely sensitive fields.

## Known limitations

- Iframe annotation is limited in `v0.x`.
- Cross-origin iframes are not supported for reliable element selection and annotation.
- Same-origin iframes may have inconsistent highlight/coordinate behavior depending on page structure.
- If a target UI is inside an iframe, open that frame URL directly in a tab when possible.

## Community

- Contributing: `CONTRIBUTING.md`
- Support: `SUPPORT.md`
- Security: `SECURITY.md`
- Privacy: `PRIVACY.md`
- Release channels: `RELEASE.md`
- Changelog: `CHANGELOG.md`

## License

MIT
