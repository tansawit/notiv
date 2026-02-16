import { useCallback, useEffect, useState } from 'react';
import { stripOriginPatternSuffix } from '../../shared/site-origin';
import {
  grantSiteOriginFromInput,
  listGrantedSiteOrigins,
  revokeSiteOrigin
} from '../../shared/site-permissions-client';

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
      setGrantedSiteOrigins(await listGrantedSiteOrigins());
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
    setSitePermissionsBusy(true);
    setFeedback(null, null);
    try {
      const { target, granted } = await grantSiteOriginFromInput(siteAccessDraft);
      if (!target) {
        setFeedback(null, 'Enter a valid http/https origin, for example https://staging.example.com.');
        return;
      }
      if (!granted) {
        setFeedback(null, `Permission request was denied for ${target.label}.`);
        return;
      }
      setSiteAccessDraft('');
      await refreshSitePermissions();
      setFeedback(`Site access granted for ${target.label}.`, null);
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
      await revokeSiteOrigin(origin);
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
