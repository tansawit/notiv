import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '../shared/constants';
import { clearLinearAuth, getLinearSettings, saveLinearSettings } from './storage';
import {
  getLocalStorageItems,
  removeLocalStorageItems,
  setLocalStorageItems
} from '../shared/chrome-storage';

vi.mock('../shared/chrome-storage', () => ({
  getLocalStorageItems: vi.fn(),
  setLocalStorageItems: vi.fn(),
  removeLocalStorageItems: vi.fn()
}));

describe('background storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads linear settings from local storage keys', async () => {
    vi.mocked(getLocalStorageItems).mockResolvedValue({
      [STORAGE_KEYS.linearAccessToken]: 'access',
      [STORAGE_KEYS.linearRefreshToken]: 'refresh',
      [STORAGE_KEYS.linearAccessTokenExpiresAt]: 1234,
      [STORAGE_KEYS.linearOAuthClientId]: 'oauth_client'
    });

    const settings = await getLinearSettings();

    expect(settings).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      accessTokenExpiresAt: 1234,
      linearOAuthClientId: 'oauth_client'
    });
    expect(getLocalStorageItems).toHaveBeenCalledWith([
      STORAGE_KEYS.linearAccessToken,
      STORAGE_KEYS.linearRefreshToken,
      STORAGE_KEYS.linearAccessTokenExpiresAt,
      STORAGE_KEYS.linearOAuthClientId
    ]);
  });

  it('writes only provided auth fields', async () => {
    vi.mocked(setLocalStorageItems).mockResolvedValue();

    await saveLinearSettings({
      accessToken: 'next_access',
      accessTokenExpiresAt: 4567,
      linearOAuthClientId: 'custom_oauth'
    });

    expect(setLocalStorageItems).toHaveBeenCalledWith({
      [STORAGE_KEYS.linearAccessToken]: 'next_access',
      [STORAGE_KEYS.linearAccessTokenExpiresAt]: 4567,
      [STORAGE_KEYS.linearOAuthClientId]: 'custom_oauth'
    });
  });

  it('clears auth and submission preference keys on disconnect', async () => {
    vi.mocked(removeLocalStorageItems).mockResolvedValue();

    await clearLinearAuth();

    expect(removeLocalStorageItems).toHaveBeenCalledWith(
      expect.arrayContaining([
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
      ])
    );
  });
});
