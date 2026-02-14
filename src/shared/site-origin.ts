export interface SiteOriginPermission {
  pattern: string;
  label: string;
}

function toSiteOriginPermission(parsed: URL): SiteOriginPermission | null {
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }

  if (!parsed.hostname) {
    return null;
  }

  return {
    pattern: `${parsed.protocol}//${parsed.hostname}/*`,
    label: parsed.origin
  };
}

export function resolveSiteOriginPermission(urlValue: string | undefined | null): SiteOriginPermission | null {
  if (!urlValue) {
    return null;
  }

  try {
    return toSiteOriginPermission(new URL(urlValue));
  } catch {
    return null;
  }
}

export function normalizeSiteOriginInput(
  value: string,
  defaultProtocol: 'https:' | 'http:' = 'https:'
): SiteOriginPermission | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalizedValue = trimmed.includes('://') ? trimmed : `${defaultProtocol}//${trimmed}`;

  try {
    return toSiteOriginPermission(new URL(normalizedValue));
  } catch {
    return null;
  }
}

export function stripOriginPatternSuffix(originPattern: string): string {
  return originPattern.replace(/\/\*$/, '');
}
