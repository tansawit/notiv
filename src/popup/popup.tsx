import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import type { BackgroundResponse } from '../shared/messages';
import { STORAGE_KEYS } from '../shared/constants';
import { getLocalStorageItems } from '../shared/chrome-storage';
import { maskAccessToken } from '../shared/linear-settings-client';
import { sendRuntimeMessage } from '../shared/runtime';
import { useLinearConnection } from '../shared/use-linear-connection';
import { Icon } from '../shared/components/Icon';
import { OnboardingWizard } from './OnboardingWizard';
import { usePopupSitePermission, usePopupTheme, useCaptureSound, useSubmissionHistory } from './hooks';
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

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function PopupApp(): React.JSX.Element {
  const [view, setView] = useState<PopupView>('home');
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
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
  const { history } = useSubmissionHistory();

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
          <h1 className="popup-title">Notis</h1>
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

      {history.length > 0 && (
        <section className="popup-panel popup-panel-flat">
          <div className="history-section">
            <div className="history-header">
              <span className="history-header-label">Recent</span>
              <button
                className={`history-toggle ${historyCollapsed ? 'collapsed' : ''}`}
                onClick={() => setHistoryCollapsed(!historyCollapsed)}
                aria-label={historyCollapsed ? 'Expand history' : 'Collapse history'}
              >
                <Icon path="M6 9l6 6 6-6" size={12} />
              </button>
            </div>
            <div className={`history-list ${historyCollapsed ? 'collapsed' : ''}`}>
              {history.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="history-item"
                  onClick={() => window.open(item.url, '_blank')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      window.open(item.url, '_blank');
                    }
                  }}
                >
                  <span className="history-item-badge">{item.identifier}</span>
                  <div className="history-item-details">
                    <span className="history-item-preview">
                      {item.firstNotePreview || `${item.noteCount} note${item.noteCount > 1 ? 's' : ''}`}
                    </span>
                    <span className="history-item-meta">
                      {item.pageDomain} · {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
            whileHover={buttonHoverScale}
            whileTap={buttonTapScale}
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
                    whileHover={createDisabledButtonHover(authBusy)}
                    whileTap={createDisabledButtonTap(authBusy)}
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
                {getThemeDisplayName(themePreference)}
              </span>
              <motion.button
                className="button"
                onClick={cycleTheme}
                whileHover={buttonHoverScale}
                whileTap={buttonTapScale}
                transition={springTransition}
              >
                {getNextThemeLabel(themePreference)}
              </motion.button>
            </div>
            <div className="settings-row-inline">
              <span className="settings-value">Capture sound</span>
              <motion.button
                className="button"
                onClick={toggleSound}
                whileHover={buttonHoverScale}
                whileTap={buttonTapScale}
                transition={springTransition}
              >
                {soundEnabled ? 'On' : 'Off'}
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
                        whileHover={createDisabledButtonHover(authBusy)}
                        whileTap={createDisabledButtonTap(authBusy)}
                        transition={springTransition}
                      >
                        Save
                      </motion.button>
                      {settings.accessToken ? (
                        <motion.button
                          className="button"
                          disabled={authBusy}
                          onClick={() => { setTokenEditing(false); setTokenDraft(settings.accessToken); }}
                          whileHover={createDisabledButtonHover(authBusy)}
                          whileTap={createDisabledButtonTap(authBusy)}
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
                      whileHover={iconButtonHoverScale}
                      whileTap={iconButtonTapScale}
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
