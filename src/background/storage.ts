import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '../shared/constants';
import type { LinearSettings } from '../shared/types';
import {
  getLocalStorageItems,
  removeLocalStorageItems,
  setLocalStorageItems
} from '../shared/chrome-storage';

interface LinearStorageShape {
  [STORAGE_KEYS.linearAccessToken]?: string;
  [STORAGE_KEYS.linearRefreshToken]?: string;
  [STORAGE_KEYS.linearAccessTokenExpiresAt]?: number;
  [STORAGE_KEYS.linearOAuthClientId]?: string;
}

export async function getLinearSettings(): Promise<LinearSettings> {
  const data = await getLocalStorageItems<LinearStorageShape>([
    STORAGE_KEYS.linearAccessToken,
    STORAGE_KEYS.linearRefreshToken,
    STORAGE_KEYS.linearAccessTokenExpiresAt,
    STORAGE_KEYS.linearOAuthClientId
  ]);

  return {
    accessToken: data[STORAGE_KEYS.linearAccessToken],
    refreshToken: data[STORAGE_KEYS.linearRefreshToken],
    accessTokenExpiresAt: data[STORAGE_KEYS.linearAccessTokenExpiresAt],
    linearOAuthClientId: data[STORAGE_KEYS.linearOAuthClientId]
  };
}

export async function saveLinearSettings(settings: Partial<LinearSettings>): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (settings.accessToken !== undefined) {
    payload[STORAGE_KEYS.linearAccessToken] = settings.accessToken;
  }
  if (settings.refreshToken !== undefined) {
    payload[STORAGE_KEYS.linearRefreshToken] = settings.refreshToken;
  }
  if (settings.accessTokenExpiresAt !== undefined) {
    payload[STORAGE_KEYS.linearAccessTokenExpiresAt] = settings.accessTokenExpiresAt;
  }
  if (settings.linearOAuthClientId !== undefined) {
    payload[STORAGE_KEYS.linearOAuthClientId] = settings.linearOAuthClientId;
  }

  await setLocalStorageItems(payload);
}

export async function clearLinearAuth(): Promise<void> {
  await removeLocalStorageItems([
    STORAGE_KEYS.linearAccessToken,
    STORAGE_KEYS.linearRefreshToken,
    STORAGE_KEYS.linearAccessTokenExpiresAt,
    STORAGE_KEYS.submitTeamId,
    STORAGE_KEYS.submitProjectId,
    STORAGE_KEYS.submitAssigneeId,
    STORAGE_KEYS.submitPriority,
    STORAGE_KEYS.submitTriage,
    STORAGE_KEYS.submitLabelIds,
    LEGACY_STORAGE_KEYS.linearTeamId,
    LEGACY_STORAGE_KEYS.linearProjectId,
    LEGACY_STORAGE_KEYS.linearDefaultLabelIds,
    LEGACY_STORAGE_KEYS.markerClickBehavior
  ]);
}
