import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { BackgroundResponse } from '../shared/messages';
import { maskAccessToken } from '../shared/linear-settings-client';
import { sendRuntimeMessage } from '../shared/runtime';
import { useLinearConnection } from '../shared/use-linear-connection';

function Icon({ path, size = 16 }: { path: string; size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

type PopupView = 'home' | 'settings';

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

function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(tabs[0] ?? null);
    });
  });
}

function containsOriginPermission(origin: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.contains({ origins: [origin] }, (granted) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(Boolean(granted));
    });
  });
}

function requestOriginPermission(origin: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.request({ origins: [origin] }, (granted) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(Boolean(granted));
    });
  });
}

function removeOriginPermission(origin: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.remove({ origins: [origin] }, (removed) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(Boolean(removed));
    });
  });
}

function PopupApp(): React.JSX.Element {
  const [view, setView] = useState<PopupView>('home');
  const [sitePermissionsLoading, setSitePermissionsLoading] = useState(true);
  const [sitePermissionsBusy, setSitePermissionsBusy] = useState(false);
  const [currentSiteTarget, setCurrentSiteTarget] = useState<SitePermissionTarget | null>(null);
  const [currentSiteGranted, setCurrentSiteGranted] = useState(false);
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

  if (view === 'home') {
    return (
      <div className="popup-shell">
        <section className="popup-panel popup-panel-flat">
          <div className="popup-header-flat">
            <h1 className="popup-title">Notiv</h1>
            <div className="popup-header-actions">
              <button className="button-ghost" onClick={() => setView('settings')}>
                Settings
              </button>
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
                <button
                  className="button"
                  onClick={() => void activatePicker()}
                >
                  Start Annotating
                </button>
              ) : unifiedStatus.actionType === 'connect' ? (
                <button
                  className="button"
                  onClick={() => void connectWithOAuth()}
                  disabled={authBusy}
                >
                  {authBusy ? 'Connecting...' : 'Connect Linear'}
                </button>
              ) : unifiedStatus.actionType === 'grant' ? (
                <button
                  className="button"
                  onClick={() => void toggleCurrentSitePermission()}
                  disabled={sitePermissionsBusy}
                >
                  {sitePermissionsBusy ? 'Granting...' : 'Grant Access'}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {error ? <div className="error">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="popup-shell">
      <section className="popup-panel popup-panel-flat">
        <div className="popup-header-flat">
          <div className="popup-header-left-flat">
            <button
              className="icon-button-ghost-small"
              onClick={() => setView('home')}
              aria-label="Back"
              title="Back"
            >
              <Icon path="M15 18l-6-6 6-6" size={14} />
            </button>
            <h1 className="popup-title">Settings</h1>
          </div>
          <button className="button-ghost" onClick={() => void openMainSettingsPage()}>
            Open
          </button>
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
              <button className="button" disabled={authBusy} onClick={() => void connectWithOAuth()}>
                {authBusy ? 'Working...' : connected ? 'Reconnect' : 'Connect'}
              </button>
              {connected ? (
                <>
                  <button className="button" disabled={authBusy || loadingResources} onClick={() => void refreshResources()}>
                    {loadingResources ? '...' : 'Refresh'}
                  </button>
                  <button className="button" disabled={authBusy} onClick={() => void disconnect()}>
                    Disconnect
                  </button>
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
              <button
                className="button"
                disabled={sitePermissionsBusy || sitePermissionsLoading || !currentSiteTarget}
                onClick={() => void toggleCurrentSitePermission()}
              >
                {sitePermissionsBusy ? 'Working...' : currentSiteGranted ? 'Revoke' : 'Grant'}
              </button>
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
                      <button className="button" disabled={authBusy} onClick={() => void saveToken()}>
                        Save
                      </button>
                      {settings.accessToken ? (
                        <button className="button" disabled={authBusy} onClick={() => { setTokenEditing(false); setTokenDraft(settings.accessToken); }}>
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="settings-row-inline">
                    <code className="token-display">{maskAccessToken(settings.accessToken)}</code>
                    <button
                      className="icon-button-ghost-small"
                      onClick={() => { setTokenEditing(true); setTokenDraft(settings.accessToken); }}
                      aria-label="Edit API token"
                      title="Edit"
                    >
                      <Icon path="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" size={12} />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>

      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="error">{error}</div> : null}
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
