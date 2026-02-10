import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import notivLogo48 from '../../assets/icons/48.png';
import notivLogo128 from '../../assets/icons/128.png';
import type { BackgroundResponse } from '../shared/messages';
import { maskAccessToken } from '../shared/linear-settings-client';
import { sendRuntimeMessage } from '../shared/runtime';
import { useLinearConnection } from '../shared/use-linear-connection';

type PopupView = 'home' | 'settings';

function PopupApp(): JSX.Element {
  const [view, setView] = useState<PopupView>('home');
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

  const homeLead = connected ? 'Ready to annotate this page.' : 'Connect Linear to start collecting notes.';

  const activatePicker = async (): Promise<void> => {
    setFeedback(null, null);
    try {
      const response = await sendRuntimeMessage<BackgroundResponse>({ type: 'activatePicker' });
      if (!response.ok) {
        throw new Error(response.error);
      }
      window.close();
    } catch (activateError) {
      setFeedback(null, activateError instanceof Error ? activateError.message : 'Could not activate picker.');
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
            <p className={`status-line ${connected ? 'connected' : 'disconnected'}`}>{homeLead}</p>
            {statusText ? <p className="meta-line">{statusText}</p> : null}
            <div className="row row-actions">
              <button className="button" onClick={() => setView('settings')}>
                Settings
              </button>
              <button
                className="button primary"
                onClick={() => void activatePicker()}
                disabled={!connected}
                title={!connected ? 'Connect Linear to activate picker' : 'Activate picker'}
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
              <span className="popup-header-back-chevron" aria-hidden="true" />
            </button>
            <img
              className="popup-header-logo"
              src={notivLogo48}
              srcSet={`${notivLogo48} 1x, ${notivLogo128} 2x`}
              alt=""
              aria-hidden="true"
            />
            <h1 className="popup-title">Linear Settings</h1>
          </div>
          <span className={`status-pill ${connected ? 'connected' : ''}`}>
            {connected ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        <div className="popup-body popup-settings-body">
          <section className="settings-connection-block">
            <p className="settings-kicker">Workspace connection</p>

            <p className={`settings-state ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? 'Linear is connected' : 'Connect Linear to continue'}
            </p>
            {statusText ? <p className="meta-line settings-meta">{statusText}</p> : null}

            <div className="settings-main-action-row">
              <button className="button primary settings-main-action" disabled={authBusy} onClick={() => void connectWithOAuth()}>
                {authBusy ? 'Working...' : connected ? 'Reconnect OAuth' : 'Connect with OAuth'}
              </button>
            </div>

            <div className="settings-secondary-actions">
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
                    ✎
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
