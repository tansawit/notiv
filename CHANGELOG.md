# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

### Added

- CI workflow running typecheck, tests, and build.
- Initial unit test suite (selector and highlight color utilities).
- `.env.example` for required local configuration.
- Open-source governance files (`CODE_OF_CONDUCT.md`, `SUPPORT.md`).
- Privacy policy (`PRIVACY.md`) with explicit data handling and retention guidance.
- Release workflow (`.github/workflows/release.yml`) that validates and publishes zipped extension artifacts on version tags.
- Background-layer unit tests for issue content builders and auth storage behavior.
- ESLint and Prettier validation scripts for repository quality gates.
- Security automation via Dependabot + CodeQL + dependency audit workflow.
- Release channel documentation (`RELEASE.md`) for official and self-host distribution paths.
- Capture redaction setting (enabled by default) with UI controls in Settings.
- OAuth client ID override support in Settings for self-host installs.

### Changed

- OAuth flow hardened for extension public-client PKCE usage (no client secret).
- OAuth now supports dual-mode client ID resolution: bundled release default or local Settings override.
- Submit workflow now captures a bounded grouped screenshot region instead of full viewport by default.
- URL capture reduced to origin only for stronger privacy defaults.
- Popup is now wired as the browser action entrypoint.
- Submit defaults (team/project/assignee/priority/triage/labels) now persist in extension storage.
- README now includes end-user install instructions from release artifacts and `dist`-based local load instructions.
- README now documents official vs self-host OAuth setup and per-site access policy.
- README and release guidance now explicitly document iframe annotation limitations for `v0.x`.
- Security and support docs now use repository-relative links and clearer private vulnerability-reporting guidance.
- Extension icons replaced with production-size 16/48/128 PNG assets.

### Removed

- Extension client-secret env usage from OAuth flow and docs.
