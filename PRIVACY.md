# Privacy Policy

Last updated: February 10, 2026

## Overview

Notis is a browser extension used to capture visual feedback and create issues in Linear. This document describes what data is processed, where it is stored, and when it is shared.

## Data processed

When you use Notis, the extension may process:

- Authentication state for Linear (OAuth access token and optional refresh token)
- Feedback content you type
- Screenshot images captured from the active tab during submission
- Element metadata for selected UI components (selector path, tag, optional component names)
- Environment metadata (viewport size, browser/OS details, page origin)
- Workspace metadata fetched from Linear (teams, projects, labels, users, viewer/workspace names)

## Data minimization

- URL capture is sanitized to origin by default.
- Site access is granted per origin by explicit user action (except localhost development defaults).
- Content scripts do not receive raw auth tokens.
- Screenshot redaction for likely sensitive form fields is enabled by default and can be disabled in Settings.
- Data is captured and submitted only on explicit user action.
- Inline image payloads are bounded to reduce oversharing and request size.

## Storage

Stored locally in Chrome extension storage:

- OAuth/access credentials and expiry metadata
- Local extension preferences and default submission choices

Feedback drafts are held in extension runtime context until submitted or discarded.

## Data sharing

Notis sends data to:

- Linear API endpoints (`https://api.linear.app/*`)

Shared data includes the issue payload you submit (description, selected metadata, screenshots, and selected routing options).

Notis does not include built-in third-party analytics or ad tracking.

## Retention and deletion

- Local extension data remains until you disconnect or remove the extension.
- Disconnecting Linear from settings clears stored auth/session submission defaults.
- Data submitted to Linear is retained according to your Linear workspace policies.

## User controls

- Connect/disconnect OAuth at any time in extension settings.
- Review, grant, or revoke per-site access in extension settings.
- Review note content before submit.
- Remove the extension to clear remaining local extension storage.

## Security

- OAuth uses Authorization Code + PKCE with state validation.
- Auth logic runs in extension/background contexts.
- See `SECURITY.md` for vulnerability reporting guidance.

## Changes

This policy may be updated as product behavior changes. Update the "Last updated" date when publishing changes.
