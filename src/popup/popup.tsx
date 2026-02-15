import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { BackgroundResponse } from '../shared/messages';
import { STORAGE_KEYS } from '../shared/constants';
import { getLocalStorageItems } from '../shared/chrome-storage';
import { maskAccessToken } from '../shared/linear-settings-client';
import { sendRuntimeMessage } from '../shared/runtime';
import { useLinearConnection } from '../shared/use-linear-connection';
import { Icon } from '../shared/components/Icon';
import { OnboardingWizard } from './OnboardingWizard';
import { usePopupSitePermission, usePopupTheme, useCaptureSound } from './hooks';

type PopupView = 'home' | 'settings';
type ThemePreference = 'system' | 'light' | 'dark';

interface StatusDisplayParams {
  ready: boolean;
  connected: boolean;
  currentSiteTarget: { label: string } | null;
  viewerName?: string;
  organizationName?: string;
}

function getStatusPrimaryText(params: StatusDisplayParams): string {
  if (params.ready) return params.viewerName ?? 'Connected';
  if (!params.connected) return 'Not connected';
  if (!params.currentSiteTarget) return 'No webpage';
  return 'Site access needed';
}

function getStatusSecondaryText(params: StatusDisplayParams): string {
  if (params.ready) return params.organizationName ?? 'Ready to annotate';
  if (!params.connected) return 'Connect Linear to start';
  if (!params.currentSiteTarget) return 'Open a webpage to annotate';
  return params.currentSiteTarget?.label ?? '';
}

function getSiteAccessStatusText(
  loading: boolean,
  hasTarget: boolean,
  granted: boolean
): string {
  if (loading) return 'Checking...';
  if (hasTarget && granted) return 'Access granted';
  if (hasTarget) return 'Not granted';
  return 'Unavailable';
}

function getThemeDisplayName(preference: ThemePreference): string {
  if (preference === 'system') return 'System';
  if (preference === 'light') return 'Light';
  return 'Dark';
}

function getNextThemeLabel(preference: ThemePreference): string {
  if (preference === 'system') return 'Use Light';
  if (preference === 'light') return 'Use Dark';
  return 'Use System';
}

function PopupApp(): React.JSX.Element {
  const [view, setView] = useState<PopupView>('home');
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
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
  const {
    sitePermissionsLoading,
    sitePermissionsBusy,
    currentSiteTarget,
    currentSiteGranted,
    refreshCurrentSitePermission,
    toggleCurrentSitePermission
  } = usePopupSitePermission({ setFeedback });
  const { themePreference, cycleTheme } = usePopupTheme();
  const { soundEnabled, toggleSound } = useCaptureSound();

  useEffect(() => {
    const loadOnboardingState = async (): Promise<void> => {
      const data = await getLocalStorageItems<Record<string, unknown>>([
        STORAGE_KEYS.onboardingCompleted
      ]);
      setOnboardingCompleted(Boolean(data[STORAGE_KEYS.onboardingCompleted]));
    };
    void loadOnboardingState();
  }, []);

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

  if (loading || onboardingCompleted === null) {
    return <div className="popup-shell"><div className="muted">Loading...</div></div>;
  }

  const showOnboarding = !onboardingCompleted && (!connected || !currentSiteGranted);

  if (showOnboarding) {
    return (
      <div className="popup-shell">
        <section className="popup-panel">
          <OnboardingWizard
            connected={connected}
            currentSiteTarget={currentSiteTarget}
            currentSiteGranted={currentSiteGranted}
            authBusy={authBusy}
            sitePermissionsBusy={sitePermissionsBusy}
            connectWithOAuth={connectWithOAuth}
            toggleCurrentSitePermission={toggleCurrentSitePermission}
            onComplete={() => setOnboardingCompleted(true)}
          />
        </section>
      </div>
    );
  }

  const homeView = (
    <div key="home" className="view-enter">
      <section className="popup-panel popup-panel-flat">
        <div className="popup-header-flat">
          <h1 className="popup-title">Notis</h1>
          <div className="popup-header-actions">
            <button
              className="button-ghost"
              onClick={() => setView('settings')}
            >
              Settings
            </button>
          </div>
        </div>
        <div className="popup-content">
          <div className="status-row">
            <span className={`status-dot ${unifiedStatus.ready ? 'ready' : !connected ? 'offline' : 'pending'}`} />
            <div className="status-identity">
              <span className="status-primary">
                {getStatusPrimaryText({
                  ready: unifiedStatus.ready,
                  connected,
                  currentSiteTarget,
                  viewerName: resources.viewerName
                })}
              </span>
              <span className="status-secondary">
                {getStatusSecondaryText({
                  ready: unifiedStatus.ready,
                  connected,
                  currentSiteTarget,
                  organizationName: resources.organizationName
                })}
              </span>
            </div>
          </div>
          <div className="popup-actions">
            {unifiedStatus.ready ? (
              <button
                className="button primary"
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

  const settingsView = (
    <div key="settings" className="view-enter">
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
          <button
            className="button-ghost"
            onClick={() => void openMainSettingsPage()}
          >
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
              <button
                className="button"
                disabled={authBusy}
                onClick={() => void connectWithOAuth()}
              >
                {authBusy ? 'Working...' : connected ? 'Reconnect' : 'Connect'}
              </button>
              {connected ? (
                <>
                  <button
                    className="button"
                    disabled={authBusy || loadingResources}
                    onClick={() => void refreshResources()}
                  >
                    {loadingResources ? '...' : 'Refresh'}
                  </button>
                  <button
                    className="button"
                    disabled={authBusy}
                    onClick={() => void disconnect()}
                  >
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
                  {getSiteAccessStatusText(
                    sitePermissionsLoading,
                    Boolean(currentSiteTarget),
                    currentSiteGranted
                  )}
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

          <div className="settings-divider" />

          <div className="settings-section">
            <span className="settings-section-label">Appearance</span>
            <div className="settings-row-inline">
              <span className="settings-value">
                {getThemeDisplayName(themePreference)}
              </span>
              <button
                className="button"
                onClick={cycleTheme}
              >
                {getNextThemeLabel(themePreference)}
              </button>
            </div>
            <div className="settings-row-inline">
              <span className="settings-value">Capture sound</span>
              <button
                className="button"
                onClick={toggleSound}
              >
                {soundEnabled ? 'On' : 'Off'}
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
                      <button
                        className="button"
                        disabled={authBusy}
                        onClick={() => void saveToken()}
                      >
                        Save
                      </button>
                      {settings.accessToken ? (
                        <button
                          className="button"
                          disabled={authBusy}
                          onClick={() => { setTokenEditing(false); setTokenDraft(settings.accessToken); }}
                        >
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

  return (
    <div className="popup-shell">
      {view === 'home' ? homeView : settingsView}
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
