# Security Policy

## Supported versions

This repository is pre-1.0. Security fixes are applied to the latest mainline state.

## Reporting a vulnerability

Please report security issues privately before public disclosure.

Preferred channel:

- GitHub Private Vulnerability Reporting in this repository: Security tab -> Report a vulnerability

If private reporting is unavailable in your environment, open a support issue requesting a private contact channel and do not include exploit details in public.

Include:

- Affected area (auth, storage, messaging, capture, etc.)
- Reproduction steps
- Impact assessment
- Suggested mitigation (if available)

## Security design notes

- OAuth uses Authorization Code + PKCE and state validation.
- Tokens are managed in extension/background contexts.
- Content scripts receive redacted auth state.
- Capture data is transmitted to Linear on submit.
