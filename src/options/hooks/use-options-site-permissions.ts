import { useCallback, useEffect, useState } from 'react';
import { getAllPermissions, removeOriginPermission, requestOriginPermission } from '../../shared/chrome-api';
import { normalizeSiteOriginInput, stripOriginPatternSuffix } from '../../shared/site-origin';

const REQUIRED_ORIGINS = new Set(['https://api.linear.app/*', 'https://linear.app/*']);

function isConfigurableSiteOrigin(originPattern: string): boolean {
  if (REQUIRED_ORIGINS.has(originPattern)) {
    return false;
  }
  return originPattern.startsWith('https://') || originPattern.startsWith('http://');
}

interface UseOptionsSitePermissionsOptions {
  setFeedback: (notice: string | null, error: string | null) => void;
}

interface UseOptionsSitePermissionsResult {
  sitePermissionsLoading: boolean;
  sitePermissionsBusy: boolean;
  siteAccessDraft: string;
  grantedSiteOrigins: string[];
  setSiteAccessDraft: (value: string) => void;
  refreshSitePermissions: () => Promise<void>;
  grantSiteAccess: () => Promise<void>;
  revokeSiteAccess: (origin: string) => Promise<void>;
  formatSiteOrigin: (origin: string) => string;
}

export function useOptionsSitePermissions(
  options: UseOptionsSitePermissionsOptions
): UseOptionsSitePermissionsResult {
  const { setFeedback } = options;
  const [sitePermissionsLoading, setSitePermissionsLoading] = useState(true);
  const [sitePermissionsBusy, setSitePermissionsBusy] = useState(false);
  const [siteAccessDraft, setSiteAccessDraft] = useState('');
  const [grantedSiteOrigins, setGrantedSiteOrigins] = useState<string[]>([]);

  const refreshSitePermissions = useCallback(async (): Promise<void> => {
    setSitePermissionsLoading(true);
    try {
      const allPermissions = await getAllPermissions();
      const nextOrigins = (allPermissions.origins ?? [])
        .filter(isConfigurableSiteOrigin)
        .sort((left, right) => left.localeCompare(right));
      setGrantedSiteOrigins(nextOrigins);
    } catch (permissionError) {
      setFeedback(
        null,
        permissionError instanceof Error ? permissionError.message : 'Could not load site permissions.'
      );
    } finally {
      setSitePermissionsLoading(false);
    }
  }, [setFeedback]);

  useEffect(() => {
    void refreshSitePermissions();
  }, [refreshSitePermissions]);

  const grantSiteAccess = useCallback(async (): Promise<void> => {
    const normalized = normalizeSiteOriginInput(siteAccessDraft);
    if (!normalized) {
      setFeedback(null, 'Enter a valid http/https origin, for example https://staging.example.com.');
      return;
    }

    setSitePermissionsBusy(true);
    setFeedback(null, null);
    try {
      const granted = await requestOriginPermission(normalized.pattern);
      if (!granted) {
        setFeedback(null, `Permission request was denied for ${normalized.label}.`);
        return;
      }
      setSiteAccessDraft('');
      await refreshSitePermissions();
      setFeedback(`Site access granted for ${normalized.label}.`, null);
    } catch (permissionError) {
      setFeedback(
        null,
        permissionError instanceof Error ? permissionError.message : 'Could not grant site access.'
      );
    } finally {
      setSitePermissionsBusy(false);
    }
  }, [refreshSitePermissions, setFeedback, siteAccessDraft]);

  const revokeSiteAccess = useCallback(async (origin: string): Promise<void> => {
    setSitePermissionsBusy(true);
    setFeedback(null, null);
    try {
      await removeOriginPermission(origin);
      await refreshSitePermissions();
      setFeedback(`Removed site access for ${stripOriginPatternSuffix(origin)}.`, null);
    } catch (permissionError) {
      setFeedback(
        null,
        permissionError instanceof Error ? permissionError.message : 'Could not remove site access.'
      );
    } finally {
      setSitePermissionsBusy(false);
    }
  }, [refreshSitePermissions, setFeedback]);

  return {
    sitePermissionsLoading,
    sitePermissionsBusy,
    siteAccessDraft,
    grantedSiteOrigins,
    setSiteAccessDraft,
    refreshSitePermissions,
    grantSiteAccess,
    revokeSiteAccess,
    formatSiteOrigin: stripOriginPatternSuffix
  };
}
