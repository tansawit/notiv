import type { BackgroundResponse } from './messages';
import type { LinearSettings, LinearWorkspaceResources } from './types';
import { EMPTY_LINEAR_RESOURCES } from './linear-resources';
import { ALLOW_LINEAR_PAT_FALLBACK } from './feature-flags';
import { sendRuntimeMessage } from './runtime';

export interface BasicLinearSettings {
  accessToken: string;
  linearOAuthClientId: string;
}

export const EMPTY_RESOURCES: LinearWorkspaceResources = EMPTY_LINEAR_RESOURCES;

export function normalizeLinearSettings(settings?: LinearSettings): BasicLinearSettings {
  return {
    accessToken: settings?.accessToken ?? '',
    linearOAuthClientId: settings?.linearOAuthClientId ?? ''
  };
}

export function maskAccessToken(token: string): string {
  const clean = token.trim();
  if (!clean) {
    return '';
  }
  if (clean.length <= 12) {
    return `${clean.slice(0, 3)}••••${clean.slice(-3)}`;
  }
  return `${clean.slice(0, 6)}••••••${clean.slice(-4)}`;
}

function expectOk<T>(response: BackgroundResponse): T {
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response.data as T;
}

export async function fetchLinearSettings(): Promise<BasicLinearSettings> {
  const response = await sendRuntimeMessage<BackgroundResponse>({ type: 'linearSettingsGet' });
  return normalizeLinearSettings(expectOk<LinearSettings>(response));
}

export async function fetchLinearResources(): Promise<LinearWorkspaceResources> {
  const response = await sendRuntimeMessage<BackgroundResponse>({ type: 'linearResourcesGet' });
  return expectOk<LinearWorkspaceResources>(response) ?? EMPTY_RESOURCES;
}

export async function saveLinearAccessToken(accessToken: string): Promise<BasicLinearSettings> {
  if (!ALLOW_LINEAR_PAT_FALLBACK) {
    throw new Error('Personal API token fallback is disabled. Connect with OAuth.');
  }
  const response = await sendRuntimeMessage<BackgroundResponse>({
    type: 'linearSettingsSave',
    payload: { accessToken }
  });
  return normalizeLinearSettings(expectOk<LinearSettings>(response));
}

export async function saveLinearOAuthClientId(linearOAuthClientId: string): Promise<BasicLinearSettings> {
  const response = await sendRuntimeMessage<BackgroundResponse>({
    type: 'linearSettingsSave',
    payload: { linearOAuthClientId }
  });
  return normalizeLinearSettings(expectOk<LinearSettings>(response));
}

export async function startLinearOAuth(): Promise<BasicLinearSettings> {
  const response = await sendRuntimeMessage<BackgroundResponse>({ type: 'linearAuthStart' });
  return normalizeLinearSettings(expectOk<LinearSettings>(response));
}

export async function disconnectLinearOAuth(): Promise<BasicLinearSettings> {
  const response = await sendRuntimeMessage<BackgroundResponse>({ type: 'linearAuthDisconnect' });
  return normalizeLinearSettings(expectOk<LinearSettings>(response));
}
