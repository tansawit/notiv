import type {
  Annotation,
  LinearIssueCreateOverrides,
  LinearLabel,
  LinearProject,
  LinearSettings,
  LinearTeam,
  LinearUser,
  LinearWorkspaceResources
} from '../shared/types';
import {
  calculatePKCECodeChallenge,
  generateRandomCodeVerifier,
  generateRandomState
} from 'oauth4webapi';
import {
  getSessionStorageItems,
  removeSessionStorageItems,
  setSessionStorageItems
} from '../shared/chrome-storage';
import {
  buildGroupedIssueDescription,
  buildIssueCreateInput,
  buildIssueDescription,
  type LinearIssueCreateInput
} from './linear-issue-content';
import {
  ISSUE_CREATE_MUTATION,
  WORKSPACE_RESOURCES_FALLBACK_QUERY,
  WORKSPACE_RESOURCES_QUERY
} from './linear-queries';
import { saveLinearSettings } from './storage';

const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';
const LINEAR_OAUTH_AUTHORIZE_URL = 'https://linear.app/oauth/authorize';
const LINEAR_OAUTH_TOKEN_URL = 'https://api.linear.app/oauth/token';
const LINEAR_OAUTH_SCOPE = 'read,write,issues:create';
const LINEAR_OAUTH_CLIENT_ID = import.meta.env.VITE_LINEAR_OAUTH_CLIENT_ID ?? '';
const OAUTH_PENDING_STORAGE_KEY = 'linearOAuthPending';
const TOKEN_REFRESH_SKEW_MS = 60_000;

interface LinearIssueResult {
  id: string;
  identifier: string;
  url: string;
}

export interface LinearOAuthResult {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
}

interface OAuthPendingState {
  state: string;
  codeVerifier: string;
  redirectUrl: string;
  createdAt: number;
}

function resolveOAuthClientId(settings?: LinearSettings): string {
  const customClientId = settings?.linearOAuthClientId?.trim();
  if (customClientId) {
    return customClientId;
  }
  return LINEAR_OAUTH_CLIENT_ID.trim();
}

function assertAccessToken(token: string | undefined): string {
  const normalized = token?.trim();
  if (!normalized) {
    throw new Error('Linear is not connected. Connect from extension settings.');
  }
  return normalized;
}

function toAuthorizationHeader(token: string): string {
  const normalized = token.trim();
  return normalized.toLowerCase().startsWith('bearer ') ? normalized : `Bearer ${normalized}`;
}

function shouldAttemptRefresh(settings: LinearSettings): boolean {
  if (!settings.refreshToken?.trim()) {
    return false;
  }
  if (!settings.accessTokenExpiresAt || !Number.isFinite(settings.accessTokenExpiresAt)) {
    return false;
  }
  return Date.now() >= settings.accessTokenExpiresAt - TOKEN_REFRESH_SKEW_MS;
}

function isUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes('401') || message.includes('403') || message.includes('unauthorized') || message.includes('forbidden');
}

async function linearGraphQL<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(LINEAR_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: toAuthorizationHeader(token)
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`Linear API returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string; extensions?: { validationErrors?: unknown; userPresentableMessage?: string } }>;
  };

  if (payload.errors && payload.errors.length > 0) {
    const first = payload.errors[0];
    const presentable = first.extensions?.userPresentableMessage;
    const details = first.extensions?.validationErrors;
    if (details) {
      throw new Error(`${presentable ?? first.message} (${JSON.stringify(details)})`);
    }
    throw new Error(presentable ?? first.message);
  }

  if (!payload.data) {
    throw new Error('Linear API returned empty data.');
  }

  return payload.data;
}

function toExpiresAt(expiresInSeconds: number | undefined): number | undefined {
  if (typeof expiresInSeconds !== 'number' || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return undefined;
  }
  return Date.now() + expiresInSeconds * 1000;
}

async function exchangeOAuthToken(input: {
  grantType: 'authorization_code' | 'refresh_token';
  clientId: string;
  code?: string;
  codeVerifier?: string;
  refreshToken?: string;
  redirectUrl: string;
}): Promise<LinearOAuthResult> {
  const body = new URLSearchParams();
  body.set('grant_type', input.grantType);
  body.set('client_id', input.clientId);
  body.set('redirect_uri', input.redirectUrl);

  if (input.grantType === 'authorization_code') {
    if (!input.code?.trim() || !input.codeVerifier?.trim()) {
      throw new Error('Missing OAuth authorization code or PKCE verifier.');
    }
    body.set('code', input.code);
    body.set('code_verifier', input.codeVerifier);
  } else {
    if (!input.refreshToken?.trim()) {
      throw new Error('Missing refresh token.');
    }
    body.set('refresh_token', input.refreshToken);
  }

  const response = await fetch(LINEAR_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    const message = payload.error_description || payload.error || `Linear OAuth token exchange failed (${response.status}).`;
    throw new Error(message);
  }

  const accessToken = payload.access_token?.trim();
  if (!accessToken) {
    throw new Error('Linear OAuth token response did not include an access token.');
  }

  return {
    accessToken,
    refreshToken: payload.refresh_token?.trim() || undefined,
    accessTokenExpiresAt: toExpiresAt(payload.expires_in)
  };
}

async function refreshLinearAccessToken(settings: LinearSettings): Promise<LinearOAuthResult> {
  const refreshToken = settings.refreshToken?.trim();
  if (!refreshToken) {
    throw new Error('Linear session has expired. Reconnect in extension settings.');
  }
  const clientId = resolveOAuthClientId(settings);
  if (!clientId) {
    const redirectUrl = chrome.identity.getRedirectURL('linear');
    throw new Error(
      `OAuth client ID is not configured. Add an OAuth client ID in Settings, or set VITE_LINEAR_OAUTH_CLIENT_ID. Required redirect URI: ${redirectUrl}`
    );
  }

  const redirectUrl = chrome.identity.getRedirectURL('linear');
  const refreshed = await exchangeOAuthToken({
    grantType: 'refresh_token',
    clientId,
    refreshToken,
    redirectUrl
  });

  await saveLinearSettings({
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? refreshToken,
    accessTokenExpiresAt: refreshed.accessTokenExpiresAt
  });

  return {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? refreshToken,
    accessTokenExpiresAt: refreshed.accessTokenExpiresAt
  };
}

async function resolveAccessToken(settings: LinearSettings): Promise<string> {
  const accessToken = assertAccessToken(settings.accessToken);

  if (!shouldAttemptRefresh(settings)) {
    return accessToken;
  }

  const refreshed = await refreshLinearAccessToken(settings);
  return assertAccessToken(refreshed.accessToken);
}

async function linearGraphQLWithAuth<T>(settings: LinearSettings, query: string, variables: Record<string, unknown>): Promise<T> {
  let token = await resolveAccessToken(settings);

  try {
    return await linearGraphQL<T>(token, query, variables);
  } catch (error) {
    if (!isUnauthorizedError(error) || !settings.refreshToken?.trim()) {
      throw error;
    }

    const refreshed = await refreshLinearAccessToken(settings);
    token = assertAccessToken(refreshed.accessToken);
    return linearGraphQL<T>(token, query, variables);
  }
}

async function createIssueWithInput(
  settings: LinearSettings,
  input: LinearIssueCreateInput
): Promise<LinearIssueResult> {
  const result = await linearGraphQLWithAuth<{
    issueCreate: {
      success: boolean;
      issue: LinearIssueResult | null;
    };
  }>(settings, ISSUE_CREATE_MUTATION, { input });

  const issue = result.issueCreate.issue;
  if (!result.issueCreate.success || !issue) {
    throw new Error('Linear did not return an issue result.');
  }
  return issue;
}

export async function createLinearIssue(
  annotation: Annotation,
  settings: LinearSettings,
  overrides?: LinearIssueCreateOverrides
): Promise<LinearIssueResult> {
  const description = buildIssueDescription(annotation, overrides?.description);
  const input = buildIssueCreateInput(annotation.titleOverride?.trim() || annotation.comment, description, overrides);
  return createIssueWithInput(settings, input);
}

export async function createLinearGroupedIssue(
  annotations: Array<Omit<Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'>>,
  groupedScreenshot: string,
  settings: LinearSettings,
  overrides?: LinearIssueCreateOverrides
): Promise<LinearIssueResult> {
  if (annotations.length === 0) {
    throw new Error('No notes to submit.');
  }

  const description = buildGroupedIssueDescription(annotations, groupedScreenshot, overrides?.description);
  const first = annotations[0];
  const input = buildIssueCreateInput(first.titleOverride?.trim() || first.comment, description, overrides);
  return createIssueWithInput(settings, input);
}

async function getLinearWorkspaceResourcesFromToken(token: string): Promise<LinearWorkspaceResources> {
  type WorkspaceQueryResult = {
    viewer?: {
      name?: string;
      organization?: {
        name?: string;
      } | null;
    };
    teams?: {
      nodes?: Array<{
        id: string;
        key: string;
        name: string;
        states?: {
          nodes?: Array<{
            id: string;
            type?: string;
          }>;
        };
        memberships?: {
          nodes?: Array<{
            user?: { id: string } | null;
          }>;
        };
      }>;
    };
    projects?: {
      nodes?: Array<{
        id: string;
        name: string;
        teams?: {
          nodes?: Array<{ id: string }>;
        };
      }>;
    };
    issueLabels?: {
      nodes?: Array<{
        id: string;
        name: string;
        color: string;
        isGroup: boolean;
        parent?: { id: string } | null;
        team?: { id: string } | null;
      }>;
    };
    users?: {
      nodes?: Array<{
        id: string;
        name?: string;
        displayName?: string;
        active?: boolean;
        avatarUrl?: string;
      }>;
    };
  };

  let result: WorkspaceQueryResult;
  try {
    result = await linearGraphQL<WorkspaceQueryResult>(token, WORKSPACE_RESOURCES_QUERY, {});
  } catch {
    result = await linearGraphQL<WorkspaceQueryResult>(token, WORKSPACE_RESOURCES_FALLBACK_QUERY, {});
  }

  const teams: LinearTeam[] = (result.teams?.nodes ?? []).map((team) => ({
    id: team.id,
    key: team.key,
    name: team.name,
    triageStateId: (team.states?.nodes ?? []).find((state) => (state.type ?? '').toLowerCase() === 'triage')?.id,
    memberIds: (team.memberships?.nodes ?? [])
      .map((membership) => membership.user?.id)
      .filter((id): id is string => Boolean(id))
  }));

  const projects: LinearProject[] = (result.projects?.nodes ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    teamIds: (project.teams?.nodes ?? []).map((team) => team.id)
  }));

  const labels: LinearLabel[] = (result.issueLabels?.nodes ?? []).map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    isGroup: label.isGroup,
    parentId: label.parent?.id ?? undefined,
    teamId: label.team?.id ?? undefined
  }));

  const users: LinearUser[] = (result.users?.nodes ?? [])
    .filter((user) => user.active !== false)
    .map((user) => ({
      id: user.id,
      name: user.displayName?.trim() || user.name?.trim() || 'Unknown',
      avatarUrl: user.avatarUrl
    }));

  return {
    viewerName: result.viewer?.name,
    organizationName: result.viewer?.organization?.name,
    teams,
    projects,
    labels,
    users
  };
}

export async function getLinearWorkspaceResources(input: string | LinearSettings): Promise<LinearWorkspaceResources> {
  if (typeof input === 'string') {
    return getLinearWorkspaceResourcesFromToken(assertAccessToken(input));
  }

  try {
    const token = await resolveAccessToken(input);
    return await getLinearWorkspaceResourcesFromToken(token);
  } catch (error) {
    if (!isUnauthorizedError(error) || !input.refreshToken?.trim()) {
      throw error;
    }

    const refreshed = await refreshLinearAccessToken(input);
    return getLinearWorkspaceResourcesFromToken(assertAccessToken(refreshed.accessToken));
  }
}

function getOAuthErrorMessage(callbackUrl: URL): string | null {
  const error = callbackUrl.searchParams.get('error') || new URLSearchParams(callbackUrl.hash.slice(1)).get('error');
  if (!error) {
    return null;
  }
  const description =
    callbackUrl.searchParams.get('error_description') ||
    new URLSearchParams(callbackUrl.hash.slice(1)).get('error_description');
  return description ? `${error}: ${description}` : error;
}

export async function runLinearOAuthFlow(settings?: LinearSettings): Promise<LinearOAuthResult> {
  const redirectUrl = chrome.identity.getRedirectURL('linear');
  const oauthClientId = resolveOAuthClientId(settings);
  if (!oauthClientId) {
    throw new Error(
      `OAuth client ID is not configured. Add an OAuth client ID in Settings, or set VITE_LINEAR_OAUTH_CLIENT_ID. Required redirect URI: ${redirectUrl}`
    );
  }

  const state = generateRandomState();
  const codeVerifier = generateRandomCodeVerifier();
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);

  await setSessionStorageItems(OAUTH_PENDING_STORAGE_KEY, {
    state,
    codeVerifier,
    redirectUrl,
    createdAt: Date.now()
  } satisfies OAuthPendingState);

  const authorizeUrl = new URL(LINEAR_OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', oauthClientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUrl);
  authorizeUrl.searchParams.set('scope', LINEAR_OAUTH_SCOPE);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);

  try {
    const callbackValue = await chrome.identity.launchWebAuthFlow({
      url: authorizeUrl.toString(),
      interactive: true
    });

    if (!callbackValue) {
      throw new Error('OAuth flow did not complete.');
    }

    const callbackUrl = new URL(callbackValue);
    const oauthError = getOAuthErrorMessage(callbackUrl);
    if (oauthError) {
      throw new Error(`OAuth authorization failed: ${oauthError}`);
    }

    const pending = await getSessionStorageItems<OAuthPendingState>(OAUTH_PENDING_STORAGE_KEY);
    if (!pending) {
      throw new Error('OAuth session expired before completion. Try again.');
    }

    const returnedState = callbackUrl.searchParams.get('state');
    if (!returnedState || returnedState !== pending.state) {
      throw new Error('OAuth state validation failed. Retry from extension settings.');
    }

    const authorizationCode = callbackUrl.searchParams.get('code');
    if (!authorizationCode?.trim()) {
      throw new Error('OAuth did not provide an authorization code.');
    }

    return exchangeOAuthToken({
      grantType: 'authorization_code',
      clientId: oauthClientId,
      code: authorizationCode.trim(),
      codeVerifier: pending.codeVerifier,
      redirectUrl: pending.redirectUrl
    });
  } finally {
    await removeSessionStorageItems(OAUTH_PENDING_STORAGE_KEY).catch(() => undefined);
  }
}
