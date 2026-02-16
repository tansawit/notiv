import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./chrome-api', () => ({
  containsOriginPermission: vi.fn(),
  getActiveTab: vi.fn(),
  getAllPermissions: vi.fn(),
  removeOriginPermission: vi.fn(),
  requestOriginPermission: vi.fn()
}));

import {
  getCurrentTabSitePermission,
  grantSiteOriginFromInput,
  listGrantedSiteOrigins,
  revokeSiteOrigin,
  toggleSiteOrigin
} from './site-permissions-client';
import {
  containsOriginPermission,
  getActiveTab,
  getAllPermissions,
  removeOriginPermission,
  requestOriginPermission
} from './chrome-api';

describe('site-permissions-client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns target and grant status for active tab', async () => {
    vi.mocked(getActiveTab).mockResolvedValue({ url: 'https://example.com/path' } as chrome.tabs.Tab);
    vi.mocked(containsOriginPermission).mockResolvedValue(true);

    const result = await getCurrentTabSitePermission();

    expect(result).toEqual({
      target: { pattern: 'https://example.com/*', label: 'https://example.com' },
      granted: true
    });
  });

  it('returns null target for non-http pages', async () => {
    vi.mocked(getActiveTab).mockResolvedValue({ url: 'chrome://extensions' } as chrome.tabs.Tab);

    const result = await getCurrentTabSitePermission();
    expect(result).toEqual({ target: null, granted: false });
  });

  it('lists configurable granted origins only', async () => {
    vi.mocked(getAllPermissions).mockResolvedValue({
      origins: [
        'https://api.linear.app/*',
        'https://linear.app/*',
        'https://z.example.com/*',
        'http://a.example.com/*'
      ]
    });

    const result = await listGrantedSiteOrigins();
    expect(result).toEqual(['http://a.example.com/*', 'https://z.example.com/*']);
  });

  it('validates and grants site origin from input', async () => {
    vi.mocked(requestOriginPermission).mockResolvedValue(true);

    const valid = await grantSiteOriginFromInput('example.com');
    const invalid = await grantSiteOriginFromInput('');

    expect(valid).toEqual({
      target: { pattern: 'https://example.com/*', label: 'https://example.com' },
      granted: true
    });
    expect(invalid).toEqual({ target: null, granted: false });
  });

  it('toggles revoke and grant flows', async () => {
    vi.mocked(removeOriginPermission).mockResolvedValue(true);
    vi.mocked(requestOriginPermission).mockResolvedValue(true);

    const target = { pattern: 'https://example.com/*', label: 'https://example.com' };

    const revokeResult = await toggleSiteOrigin(target, true);
    const grantResult = await toggleSiteOrigin(target, false);
    const revokeCallResult = await revokeSiteOrigin(target.pattern);

    expect(revokeResult).toEqual({ granted: false, revoked: true });
    expect(grantResult).toEqual({ granted: true, revoked: false });
    expect(revokeCallResult).toBe(true);
  });
});
