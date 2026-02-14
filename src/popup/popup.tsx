import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import type { BackgroundResponse } from '../shared/messages';
import { maskAccessToken } from '../shared/linear-settings-client';
import { sendRuntimeMessage } from '../shared/runtime';
import { useLinearConnection } from '../shared/use-linear-connection';
import { STORAGE_KEYS } from '../shared/constants';
import { Icon } from '../shared/components/Icon';
import {
  getActiveTab,
  containsOriginPermission,
  requestOriginPermission,
  removeOriginPermission
} from '../shared/chrome-api';
import {
  springTransition,
  buttonHoverScale,
  buttonTapScale,
  buttonTapScaleWithY,
  iconButtonHoverScale,
  iconButtonTapScale,
  createDisabledButtonHover,
  createDisabledButtonTap,
  viewVariants,
  viewTransition,
} from '../shared/motion-presets';

type PopupView = 'home' | 'settings';
type ThemePreference = 'system' | 'light' | 'dark';

interface SitePermissionTarget {
  pattern: string;
  label: string;
}

function resolveSitePermissionTarget(urlValue: string | undefined): SitePermissionTarget | null {
  if (!urlValue) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(urlValue);
  } catch {
    return null;
  }

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

function PopupApp(): React.JSX.Element {
  const [view, setView] = useState<PopupView>('home');
  const [sitePermissionsLoading, setSitePermissionsLoading] = useState(true);
  const [sitePermissionsBusy, setSitePermissionsBusy] = useState(false);
  const [currentSiteTarget, setCurrentSiteTarget] = useState<SitePermissionTarget | null>(null);
  const [currentSiteGranted, setCurrentSiteGranted] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const {
    loading,
    authBusy,
    loadingResources,
    error,
    notice,
    settings,
    resources,
    allowPatFallback,
    tokenDraft,
    tokenEditing,
    connected,
    setTokenDraft,
    setTokenEditing,
    setFeedback,
    saveToken,
    connectWithOAuth,
    disconnect,
    refreshResources
  } = useLinearConnection();

  const unifiedStatus = useMemo(() => {
    if (sitePermissionsLoading) {
      return { ready: false, label: 'Checking...', actionType: null as 'connect' | 'grant' | null };
    }
    if (!connected) {
      return { ready: false, label: 'Setup needed', actionType: 'connect' as const };
    }
    if (!currentSiteTarget) {
      return { ready: false, label: 'Unavailable', actionType: null };
    }
    if (!currentSiteGranted) {
      return { ready: false, label: 'Setup needed', actionType: 'grant' as const };
    }
    return { ready: true, label: 'Ready', actionType: null };
  }, [connected, currentSiteTarget, currentSiteGranted, sitePermissionsLoading]);

  const openMainSettingsPage = async (): Promise<void> => {
    const response = await sendRuntimeMessage<BackgroundResponse>({ type: 'openSettingsPage' });
    if (!response.ok) {
      throw new Error(response.error);
    }
    window.close();
  };

  const refreshCurrentSitePermission = React.useCallback(async (): Promise<void> => {
    setSitePermissionsLoading(true);
    try {
      const tab = await getActiveTab();
      const target = resolveSitePermissionTarget(tab?.url);
      setCurrentSiteTarget(target);
      if (!target) {
        setCurrentSiteGranted(false);
        return;
      }
      setCurrentSiteGranted(await containsOriginPermission(target.pattern));
    } catch (permissionError) {
      setFeedback(
        null,
        permissionError instanceof Error ? permissionError.message : 'Could not load site permissions.'
      );
    } finally {
      setSitePermissionsLoading(false);
    }
  }, [setFeedback]);

  React.useEffect(() => {
    void refreshCurrentSitePermission();
  }, [refreshCurrentSitePermission]);

  const applyTheme = useCallback((pref: ThemePreference) => {
    document.documentElement.removeAttribute('data-theme');
    if (pref === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (pref === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.themePreference], (result) => {
      const stored = result[STORAGE_KEYS.themePreference] as ThemePreference | undefined;
      if (stored && ['system', 'light', 'dark'].includes(stored)) {
        setThemePreference(stored);
        applyTheme(stored);
      }
    });
  }, [applyTheme]);

  const cycleTheme = useCallback(() => {
    const next: ThemePreference =
      themePreference === 'system' ? 'light' :
      themePreference === 'light' ? 'dark' : 'system';
    setThemePreference(next);
    applyTheme(next);
    chrome.storage.local.set({ [STORAGE_KEYS.themePreference]: next });
  }, [themePreference, applyTheme]);

  const toggleCurrentSitePermission = async (): Promise<void> => {
    if (!currentSiteTarget) {
      setFeedback(null, 'Current tab is not a regular http/https page.');
      return;
    }

    const target = currentSiteTarget;
    const shouldRevoke = currentSiteGranted;
    setSitePermissionsBusy(true);
    setFeedback(null, null);
    try {
      if (shouldRevoke) {
        await removeOriginPermission(target.pattern);
      } else {
        const granted = await requestOriginPermission(target.pattern);
        if (!granted) {
          setFeedback(null, `Permission request was denied for ${target.label}.`);
          return;
        }
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
  };

  const activatePicker = async (): Promise<void> => {
    setFeedback(null, null);
    try {
      const response = await sendRuntimeMessage<BackgroundResponse>({ type: 'activatePicker' });
      if (!response.ok) {
        throw new Error(response.error);
      }
      window.close();
    } catch (activateError) {
      const message =
        activateError instanceof Error ? activateError.message : 'Could not activate picker.';
      setFeedback(null, message);
      if (message.toLowerCase().includes('site access was not granted')) {
        setView('settings');
        void refreshCurrentSitePermission();
      }
    }
  };

  if (loading) {
    return <div className="popup-shell"><div className="muted">Loading...</div></div>;
  }

  /* ─────────────────────────────────────────────────────────
   * VIEW TRANSITION
   *
   * Drill-down navigation: vertical fade, not horizontal slide.
   * Forward (→ settings): fade out, new content rises in
   * Back (→ home): fade out, content settles down
   * ───────────────────────────────────────────────────────── */
  const homeView = (
    <motion.div
      key="home"
      custom={-1}
      variants={viewVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={viewTransition}
    >
      <section className="popup-panel popup-panel-flat">
        <div className="popup-header-flat">
          <h1 className="popup-title">Notiv</h1>
          <div className="popup-header-actions">
            <motion.button
              className="button-ghost"
              onClick={() => setView('settings')}
              whileHover={buttonHoverScale}
              whileTap={buttonTapScale}
              transition={springTransition}
            >
              Settings
            </motion.button>
          </div>
        </div>
        <div className="popup-content">
          <div className="status-row">
            <span className={`status-dot ${unifiedStatus.ready ? 'ready' : !connected ? 'offline' : 'pending'}`} />
            <div className="status-identity">
              <span className="status-primary">
                {unifiedStatus.ready
                  ? (resources.viewerName ?? 'Connected')
                  : !connected
                    ? 'Not connected'
                    : !currentSiteTarget
                      ? 'No webpage'
                      : 'Site access needed'}
              </span>
              <span className="status-secondary">
                {unifiedStatus.ready
                  ? (resources.organizationName ?? 'Ready to annotate')
                  : !connected
                    ? 'Connect Linear to start'
                    : !currentSiteTarget
                      ? 'Open a webpage to annotate'
                      : currentSiteTarget.label}
              </span>
            </div>
          </div>
          <div className="popup-actions">
            {unifiedStatus.ready ? (
              <motion.button
                className="button primary"
                onClick={() => void activatePicker()}
                whileHover={buttonHoverScale}
                whileTap={buttonTapScaleWithY}
                transition={springTransition}
              >
                Start Annotating
              </motion.button>
            ) : unifiedStatus.actionType === 'connect' ? (
              <motion.button
                className="button"
                onClick={() => void connectWithOAuth()}
                disabled={authBusy}
                whileHover={createDisabledButtonHover(authBusy)}
                whileTap={createDisabledButtonTap(authBusy, true)}
                transition={springTransition}
              >
                {authBusy ? 'Connecting...' : 'Connect Linear'}
              </motion.button>
            ) : unifiedStatus.actionType === 'grant' ? (
              <motion.button
                className="button"
                onClick={() => void toggleCurrentSitePermission()}
                disabled={sitePermissionsBusy}
                whileHover={createDisabledButtonHover(sitePermissionsBusy)}
                whileTap={createDisabledButtonTap(sitePermissionsBusy, true)}
                transition={springTransition}
              >
                {sitePermissionsBusy ? 'Granting...' : 'Grant Access'}
              </motion.button>
            ) : null}
          </div>
        </div>
      </section>
      {error ? <div className="error">{error}</div> : null}
    </motion.div>
  );

  const settingsView = (
    <motion.div
      key="settings"
      custom={1}
      variants={viewVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={viewTransition}
    >
      <section className="popup-panel popup-panel-flat">
        <div className="popup-header-flat">
          <div className="popup-header-left-flat">
            <motion.button
              className="icon-button-ghost-small"
              onClick={() => setView('home')}
              aria-label="Back"
              title="Back"
              whileHover={iconButtonHoverScale}
              whileTap={iconButtonTapScale}
              transition={springTransition}
            >
              <Icon path="M15 18l-6-6 6-6" size={14} />
            </motion.button>
            <h1 className="popup-title">Settings</h1>
          </div>
          <motion.button
            className="button-ghost"
            onClick={() => void openMainSettingsPage()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={springTransition}
          >
            Open
          </motion.button>
        </div>

        <div className="popup-content settings-content">
          <div className="settings-section">
            <span className="settings-section-label">Linear</span>
            <div className="status-row">
              <span className={`status-dot ${connected ? 'ready' : 'offline'}`} />
              <div className="status-identity">
                <span className="status-primary">
                  {connected ? (resources.viewerName ?? 'Connected') : 'Not connected'}
                </span>
                <span className="status-secondary">
                  {connected ? (resources.organizationName ?? 'Linear workspace') : 'Connect to start'}
                </span>
              </div>
            </div>
            <div className="popup-actions">
              <motion.button
                className="button"
                disabled={authBusy}
                onClick={() => void connectWithOAuth()}
                whileHover={createDisabledButtonHover(authBusy)}
                whileTap={createDisabledButtonTap(authBusy)}
                transition={springTransition}
              >
                {authBusy ? 'Working...' : connected ? 'Reconnect' : 'Connect'}
              </motion.button>
              {connected ? (
                <>
                  <motion.button
                    className="button"
                    disabled={authBusy || loadingResources}
                    onClick={() => void refreshResources()}
                    whileHover={createDisabledButtonHover(authBusy || loadingResources)}
                    whileTap={createDisabledButtonTap(authBusy || loadingResources)}
                    transition={springTransition}
                  >
                    {loadingResources ? '...' : 'Refresh'}
                  </motion.button>
                  <motion.button
                    className="button"
                    disabled={authBusy}
                    onClick={() => void disconnect()}
                    whileHover={{ scale: authBusy ? 1 : 1.02 }}
                    whileTap={{ scale: authBusy ? 1 : 0.96 }}
                    transition={springTransition}
                  >
                    Disconnect
                  </motion.button>
                </>
              ) : null}
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-section">
            <span className="settings-section-label">Site access</span>
            <div className="status-row">
              <span className={`status-dot ${currentSiteTarget && currentSiteGranted ? 'ready' : sitePermissionsLoading ? 'pending' : 'offline'}`} />
              <div className="status-identity">
                <span className="status-primary">
                  {sitePermissionsLoading
                    ? 'Checking...'
                    : currentSiteTarget && currentSiteGranted
                      ? 'Access granted'
                      : currentSiteTarget
                        ? 'Not granted'
                        : 'Unavailable'}
                </span>
                <span className="status-secondary">
                  {currentSiteTarget ? currentSiteTarget.label : 'Not a regular webpage'}
                </span>
              </div>
            </div>
            <div className="popup-actions">
              <motion.button
                className="button"
                disabled={sitePermissionsBusy || sitePermissionsLoading || !currentSiteTarget}
                onClick={() => void toggleCurrentSitePermission()}
                whileHover={createDisabledButtonHover(sitePermissionsBusy || sitePermissionsLoading || !currentSiteTarget)}
                whileTap={createDisabledButtonTap(sitePermissionsBusy || sitePermissionsLoading || !currentSiteTarget)}
                transition={springTransition}
              >
                {sitePermissionsBusy ? 'Working...' : currentSiteGranted ? 'Revoke' : 'Grant'}
              </motion.button>
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-section">
            <span className="settings-section-label">Appearance</span>
            <div className="settings-row-inline">
              <span className="settings-value">
                {themePreference === 'system' ? 'System' : themePreference === 'light' ? 'Light' : 'Dark'}
              </span>
              <motion.button
                className="button"
                onClick={cycleTheme}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={springTransition}
              >
                {themePreference === 'system' ? 'Use Light' : themePreference === 'light' ? 'Use Dark' : 'Use System'}
              </motion.button>
            </div>
          </div>

          {allowPatFallback ? (
            <>
              <div className="settings-divider" />
              <div className="settings-section">
                <span className="settings-section-label">API Token</span>
                {tokenEditing ? (
                  <>
                    <input
                      className="input"
                      type="password"
                      placeholder="lin_api_..."
                      value={tokenDraft}
                      onChange={(event) => setTokenDraft(event.target.value)}
                      autoFocus
                    />
                    <div className="popup-actions">
                      <motion.button
                        className="button"
                        disabled={authBusy}
                        onClick={() => void saveToken()}
                        whileHover={{ scale: authBusy ? 1 : 1.02 }}
                        whileTap={{ scale: authBusy ? 1 : 0.96 }}
                        transition={springTransition}
                      >
                        Save
                      </motion.button>
                      {settings.accessToken ? (
                        <motion.button
                          className="button"
                          disabled={authBusy}
                          onClick={() => { setTokenEditing(false); setTokenDraft(settings.accessToken); }}
                          whileHover={{ scale: authBusy ? 1 : 1.02 }}
                          whileTap={{ scale: authBusy ? 1 : 0.96 }}
                          transition={springTransition}
                        >
                          Cancel
                        </motion.button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="settings-row-inline">
                    <code className="token-display">{maskAccessToken(settings.accessToken)}</code>
                    <motion.button
                      className="icon-button-ghost-small"
                      onClick={() => { setTokenEditing(true); setTokenDraft(settings.accessToken); }}
                      aria-label="Edit API token"
                      title="Edit"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={springTransition}
                    >
                      <Icon path="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" size={12} />
                    </motion.button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>

      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="error">{error}</div> : null}
    </motion.div>
  );

  return (
    <div className="popup-shell">
      <AnimatePresence mode="wait" custom={view === 'home' ? -1 : 1}>
        {view === 'home' ? homeView : settingsView}
      </AnimatePresence>
    </div>
  );
}

const rootNode = document.getElementById('root');
if (!rootNode) {
  throw new Error('Popup root not found.');
}

createRoot(rootNode).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
