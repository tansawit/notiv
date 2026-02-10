# Release Channels

## Official channel

- Artifact source: GitHub Releases (`notiv-extension-<version>.zip`)
- Build source: tagged commits (`v*`) via `.github/workflows/release.yml`
- OAuth mode: bundled client ID via repository secret `LINEAR_OAUTH_CLIENT_ID`

## Self-host channel

- Artifact source: local `pnpm run build` + unpacked load
- OAuth mode: user-provided `OAuth client ID override` in extension Settings

## Release checklist

1. Ensure `LINEAR_OAUTH_CLIENT_ID` secret is set.
2. Run `pnpm run lint && pnpm run check && pnpm run test:run && pnpm run build`.
3. Tag release (`vX.Y.Z`) and push tag.
4. Verify generated GitHub release includes `notiv-extension-<version>.zip`.

## Release notes baseline

- Include this known limitation in each `v0.x` release note:
  - `Iframe annotation is limited in v0.x. Cross-origin iframes are not supported for reliable element selection and annotation.`
