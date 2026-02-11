import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import notivLogo48 from '../../assets/icons/48.png';
import notivLogo128 from '../../assets/icons/128.png';
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

  const statusText = useMemo(() => {
    if (!connected) {
      return null;
    }
    const viewer = resources.viewerName ?? 'Unknown user';
    const org = resources.organizationName ?? 'workspace';
    return `Connected as ${viewer} to ${org}`;
  }, [connected, resources.viewerName, resources.organizationName]);

  const canAnnotateOnCurrentSite = connected && Boolean(currentSiteTarget) && currentSiteGranted;
  const siteStatusLabel = sitePermissionsLoading
    ? 'Checking'
    : currentSiteTarget
      ? currentSiteGranted
        ? 'Granted'
        : 'Not granted'
      : 'Unavailable';
  const homeLead = !connected
    ? 'Connect Linear to start collecting notes.'
    : canAnnotateOnCurrentSite
      ? 'Ready to annotate this page.'
      : 'Annotation unavailable for this page.';
  const homeWarning = connected && !canAnnotateOnCurrentSite
    ? sitePermissionsLoading
      ? 'Checking site access for this page.'
      : currentSiteTarget
        ? `Site access for ${currentSiteTarget.label}: not granted`
        : 'Open a regular http/https page to annotate.'
    : null;
  const isSiteAccessError = Boolean(error && error.toLowerCase().includes('site access was not granted'));
  const openSiteAccessSettings = (): void => setView('settings');

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

  const handleSiteAccessErrorAction = async (): Promise<void> => {
    if (currentSiteTarget && !currentSiteGranted) {
      await toggleCurrentSitePermission();
      return;
    }
    openSiteAccessSettings();
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
        <section className="popup-panel">
          <div className="popup-header">
            <div className="popup-header-left">
              <img
                className="popup-header-logo"
                src={notivLogo48}
                srcSet={`${notivLogo48} 1x, ${notivLogo128} 2x`}
                alt=""
                aria-hidden="true"
              />
              <h1 className="popup-title">Notiv</h1>
            </div>
            <span className={`status-pill ${connected ? 'connected' : ''}`}>
              {connected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="popup-body">
            <p className={`status-line ${canAnnotateOnCurrentSite ? 'connected' : 'disconnected'}`}>{homeLead}</p>
            {statusText ? <p className="meta-line">{statusText}</p> : null}
            {homeWarning ? <div className="home-warning">{homeWarning}</div> : null}
            <div className="row row-actions">
              <button className="button" onClick={() => setView('settings')}>
                Settings
              </button>
              <button
                className="button primary"
                onClick={() => void activatePicker()}
                disabled={!connected || !currentSiteGranted || !currentSiteTarget || sitePermissionsLoading}
                title={
                  !connected
                    ? 'Connect Linear to activate picker'
                    : sitePermissionsLoading
                      ? 'Checking site access'
                      : !currentSiteTarget
                        ? 'Open a regular http/https page to annotate'
                        : !currentSiteGranted
                          ? 'Grant site access to activate picker'
                          : 'Activate picker'
                }
              >
                Activate
              </button>
            </div>
          </div>
        </section>

        {error ? <div className="error">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="popup-shell popup-settings">
      <section className="popup-panel">
        <div className="popup-header">
          <div className="popup-header-left">
            <button
              className="button button-compact popup-header-back"
              onClick={() => setView('home')}
              aria-label="Back"
              title="Back"
            >
              <Icon path="M15 18l-6-6 6-6" size={14} />
            </button>
            <img
              className="popup-header-logo"
              src={notivLogo48}
              srcSet={`${notivLogo48} 1x, ${notivLogo128} 2x`}
              alt=""
              aria-hidden="true"
            />
            <h1 className="popup-title">Settings</h1>
          </div>
        </div>

        <div className="popup-body popup-settings-body">
          <section className="settings-connection-block">
            <div className="settings-section-head">
              <p className="settings-kicker">Linear</p>
              <span className={`status-pill ${connected ? 'connected' : ''}`}>
                {connected ? 'Connected' : 'Not connected'}
              </span>
            </div>
            {statusText ? <p className="meta-line settings-meta">{statusText}</p> : null}

            <div className="settings-connection-actions">
              <button className="button primary settings-secondary-action" disabled={authBusy} onClick={() => void connectWithOAuth()}>
                {authBusy ? 'Working...' : connected ? 'Reconnect' : 'Connect with OAuth'}
              </button>
              <button
                className="button settings-secondary-action"
                disabled={authBusy || loadingResources || !connected}
                onClick={() => void refreshResources()}
              >
                {loadingResources ? 'Refreshing...' : 'Refresh'}
              </button>
              <button className="button settings-secondary-action" disabled={authBusy || !connected} onClick={() => void disconnect()}>
                Disconnect
              </button>
            </div>
          </section>

          {allowPatFallback ? (
            <section className="settings-token-block">
              <p className="settings-kicker">API token fallback</p>

              {tokenEditing ? (
                <label className="label">
                  API Token
                  <input
                    className="input"
                    type="password"
                    placeholder="lin_api_..."
                    value={tokenDraft}
                    onChange={(event) => setTokenDraft(event.target.value)}
                    autoFocus
                  />
                </label>
              ) : (
                <div className="token-row">
                  <div className="token-badge">{maskAccessToken(settings.accessToken)}</div>
                  <button
                    className="icon-button"
                    onClick={() => {
                      setTokenEditing(true);
                      setTokenDraft(settings.accessToken);
                    }}
                    aria-label="Edit API token"
                    title="Edit API token"
                  >
                    <Icon path="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" size={15} />
                  </button>
                </div>
              )}

              {tokenEditing ? (
                <div className="settings-token-actions">
                  <button className="button primary" disabled={authBusy} onClick={() => void saveToken()}>
                    Save token
                  </button>
                  {settings.accessToken ? (
                    <button
                      className="button"
                      disabled={authBusy}
                      onClick={() => {
                        setTokenEditing(false);
                        setTokenDraft(settings.accessToken);
                      }}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="settings-site-block">
            <div className="settings-section-head">
              <p className="settings-kicker">Site access</p>
              <span className={`site-status-pill ${currentSiteTarget && currentSiteGranted ? 'granted' : ''}`}>
                {siteStatusLabel}
              </span>
            </div>
            <p className="meta-line settings-meta">
              {sitePermissionsLoading
                ? 'Checking current site...'
                : currentSiteTarget
                  ? `Current site: ${currentSiteTarget.label}`
                  : 'Current tab is not a regular http/https page.'}
            </p>
            <div className="settings-site-current-row">
              <button
                className={`button settings-site-quick ${currentSiteGranted ? '' : 'primary'}`}
                disabled={sitePermissionsBusy || sitePermissionsLoading || !currentSiteTarget}
                onClick={() => void toggleCurrentSitePermission()}
              >
                {sitePermissionsBusy
                  ? 'Working...'
                  : currentSiteGranted
                    ? 'Revoke'
                    : 'Grant'}
              </button>
              <button className="button settings-site-refresh" disabled={sitePermissionsLoading || sitePermissionsBusy} onClick={() => void refreshCurrentSitePermission()}>
                Refresh
              </button>
            </div>
            <button className="button settings-site-open-full" onClick={() => void openMainSettingsPage()}>
              Open full site access settings
            </button>
          </section>
        </div>
      </section>

      {notice ? <div className="notice">{notice}</div> : null}
      {error ? (
        <div className={`error ${isSiteAccessError ? 'error-with-action' : ''}`}>
          <div>{error}</div>
          {isSiteAccessError ? (
            <button className="button button-compact error-action" onClick={() => void handleSiteAccessErrorAction()}>
              {currentSiteTarget && !currentSiteGranted ? 'Grant' : 'Open site access'}
            </button>
          ) : null}
        </div>
      ) : null}
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
