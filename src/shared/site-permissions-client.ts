import type { SiteOriginPermission } from './site-origin';
import {
  normalizeSiteOriginInput,
  resolveSiteOriginPermission
} from './site-origin';
import {
  containsOriginPermission,
  getActiveTab,
  getAllPermissions,
  removeOriginPermission,
  requestOriginPermission
} from './chrome-api';

const REQUIRED_ORIGINS = new Set(['https://api.linear.app/*', 'https://linear.app/*']);

function isConfigurableSiteOrigin(originPattern: string): boolean {
  if (REQUIRED_ORIGINS.has(originPattern)) {
    return false;
  }
  return originPattern.startsWith('https://') || originPattern.startsWith('http://');
}

export async function getCurrentTabSitePermission(): Promise<{
  target: SiteOriginPermission | null;
  granted: boolean;
}> {
  const tab = await getActiveTab();
  const target = resolveSiteOriginPermission(tab?.url);
  if (!target) {
    return { target: null, granted: false };
  }
  const granted = await containsOriginPermission(target.pattern);
  return { target, granted };
}

export async function listGrantedSiteOrigins(): Promise<string[]> {
  const allPermissions = await getAllPermissions();
  return (allPermissions.origins ?? [])
    .filter(isConfigurableSiteOrigin)
    .sort((left, right) => left.localeCompare(right));
}

export async function grantSiteOriginFromInput(value: string): Promise<{
  target: SiteOriginPermission | null;
  granted: boolean;
}> {
  const target = normalizeSiteOriginInput(value);
  if (!target) {
    return { target: null, granted: false };
  }
  const granted = await requestOriginPermission(target.pattern);
  return { target, granted };
}

export async function revokeSiteOrigin(pattern: string): Promise<boolean> {
  return removeOriginPermission(pattern);
}

export async function toggleSiteOrigin(
  target: SiteOriginPermission,
  currentlyGranted: boolean
): Promise<{ granted: boolean; revoked: boolean }> {
  if (currentlyGranted) {
    const revoked = await removeOriginPermission(target.pattern);
    return { granted: !revoked, revoked };
  }
  const granted = await requestOriginPermission(target.pattern);
  return { granted, revoked: false };
}
