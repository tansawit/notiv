import { useCallback, useEffect, useState } from 'react';
import type { SiteOriginPermission } from '../../shared/site-origin';
import {
  getCurrentTabSitePermission,
  toggleSiteOrigin
} from '../../shared/site-permissions-client';

interface UsePopupSitePermissionOptions {
  setFeedback: (notice: string | null, error: string | null) => void;
}

interface UsePopupSitePermissionResult {
  sitePermissionsLoading: boolean;
  sitePermissionsBusy: boolean;
  currentSiteTarget: SiteOriginPermission | null;
  currentSiteGranted: boolean;
  refreshCurrentSitePermission: () => Promise<void>;
  toggleCurrentSitePermission: () => Promise<void>;
}

export function usePopupSitePermission(
  options: UsePopupSitePermissionOptions
): UsePopupSitePermissionResult {
  const { setFeedback } = options;
  const [sitePermissionsLoading, setSitePermissionsLoading] = useState(true);
  const [sitePermissionsBusy, setSitePermissionsBusy] = useState(false);
  const [currentSiteTarget, setCurrentSiteTarget] = useState<SiteOriginPermission | null>(null);
  const [currentSiteGranted, setCurrentSiteGranted] = useState(false);

  const refreshCurrentSitePermission = useCallback(async (): Promise<void> => {
    setSitePermissionsLoading(true);
    try {
      const { target, granted } = await getCurrentTabSitePermission();
      setCurrentSiteTarget(target);
      setCurrentSiteGranted(granted);
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
    void refreshCurrentSitePermission();
  }, [refreshCurrentSitePermission]);

  const toggleCurrentSitePermission = useCallback(async (): Promise<void> => {
    if (!currentSiteTarget) {
      setFeedback(null, 'Current tab is not a regular http/https page.');
      return;
    }

    const target = currentSiteTarget;
    const shouldRevoke = currentSiteGranted;
    setSitePermissionsBusy(true);
    setFeedback(null, null);
    try {
      const { granted, revoked } = await toggleSiteOrigin(target, shouldRevoke);
      if (!granted && !revoked) {
        setFeedback(null, `Permission request was denied for ${target.label}.`);
        return;
      }
      await refreshCurrentSitePermission();
      setFeedback(
        shouldRevoke
          ? `Removed site access for ${target.label}.`
          : `Site access granted for ${target.label}.`,
        null
      );
    } catch (permissionError) {
      setFeedback(
        null,
        permissionError instanceof Error ? permissionError.message : 'Could not update site access.'
      );
    } finally {
      setSitePermissionsBusy(false);
    }
  }, [currentSiteGranted, currentSiteTarget, refreshCurrentSitePermission, setFeedback]);

  return {
    sitePermissionsLoading,
    sitePermissionsBusy,
    currentSiteTarget,
    currentSiteGranted,
    refreshCurrentSitePermission,
    toggleCurrentSitePermission,
  };
}
