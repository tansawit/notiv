import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { maskAccessToken } from '../shared/linear-settings-client';
import { useLinearConnection } from '../shared/use-linear-connection';
import { Icon } from '../shared/components/Icon';
import { useCaptureRedaction, useOptionsSitePermissions } from './hooks';

function getRedactionButtonText(busy: boolean, enabled: boolean): string {
  if (busy) return 'Working...';
  if (enabled) return 'Disable redaction';
  return 'Enable redaction';
}

function SettingsApp(): React.JSX.Element {
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
    oauthClientIdDraft,
    connected,
    setTokenDraft,
    setTokenEditing,
    setOauthClientIdDraft,
    setFeedback,
    saveToken,
    saveOAuthClientId,
    connectWithOAuth,
    disconnect,
    refreshResources
  } = useLinearConnection();
  const {
    sitePermissionsLoading,
    sitePermissionsBusy,
    siteAccessDraft,
    grantedSiteOrigins,
    setSiteAccessDraft,
    refreshSitePermissions,
    grantSiteAccess,
    revokeSiteAccess,
    formatSiteOrigin
  } = useOptionsSitePermissions({ setFeedback });
  const {
    captureRedactionEnabled,
    captureRedactionBusy,
    toggleCaptureRedaction
  } = useCaptureRedaction({ setFeedback });

  const oauthRedirectUrl = useMemo(() => chrome.identity.getRedirectURL('linear'), []);

  const workspaceSummary = useMemo(() => {
    if (!connected) {
      return 'Not connected';
    }
    const viewer = resources.viewerName ? ` as ${resources.viewerName}` : '';
    const org = resources.organizationName ? ` to ${resources.organizationName}` : '';
    return `Connected${viewer}${org}`;
  }, [connected, resources.viewerName, resources.organizationName]);

  if (loading) {
    return (
      <div className="settings-shell">
        <div className="muted">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-shell">
      <header className="page-head">
        <h1 className="page-title">Notis Settings</h1>
        <p className="page-subtitle">Linear connection and site permissions.</p>
      </header>

      <section className="panel">
        <div className="panel-head">
          <strong>Linear</strong>
          <span className={`status-badge ${connected ? 'ready' : ''}`}>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {allowPatFallback ? (
          tokenEditing ? (
            <label className="label">
              API token (optional fallback)
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
          )
        ) : null}

        <div className="actions">
          <button className={`button primary ${authBusy ? 'loading' : ''}`} disabled={authBusy} onClick={() => void connectWithOAuth()}>
            {authBusy ? 'Connecting...' : connected ? 'Reconnect' : 'Connect with OAuth'}
          </button>
          {allowPatFallback && tokenEditing ? (
            <>
              <button className="button" disabled={authBusy} onClick={() => void saveToken()}>
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
            </>
          ) : null}
          <button className="button" disabled={authBusy || loadingResources || !connected} onClick={() => void refreshResources()}>
            {loadingResources ? 'Refreshing...' : 'Refresh workspace'}
          </button>
          <button className="button" disabled={authBusy || !connected} onClick={() => void disconnect()}>
            Disconnect
          </button>
        </div>

        <div className="meta-line">{workspaceSummary}</div>
        <div className="meta-line">
          OAuth redirect URI: <code>{oauthRedirectUrl}</code>
        </div>
        <label className="label">
          OAuth client ID override (self-host only)
          <input
            className="input"
            type="text"
            placeholder="your_linear_oauth_client_id"
            value={oauthClientIdDraft}
            onChange={(event) => setOauthClientIdDraft(event.target.value)}
          />
        </label>
        <div className="actions">
          <button className="button" disabled={authBusy} onClick={() => void saveOAuthClientId()}>
            Save OAuth client ID
          </button>
          <button
            className="button"
            disabled={authBusy || !oauthClientIdDraft.trim()}
            onClick={() => {
              setOauthClientIdDraft('');
              void saveOAuthClientId('');
            }}
          >
            Clear override
          </button>
        </div>
        <div className="meta-line">
          {settings.linearOAuthClientId.trim()
            ? 'Using saved OAuth client ID override for this local install.'
            : 'Using bundled OAuth client ID from the official build.'}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <strong>Site access</strong>
          <span className="status-badge">{grantedSiteOrigins.length} granted</span>
        </div>
        <div className="meta-line">Notis only runs on sites you explicitly allow.</div>
        <label className="label">
          Grant site access
          <input
            className="input"
            type="text"
            placeholder="https://staging.example.com"
            value={siteAccessDraft}
            onChange={(event) => setSiteAccessDraft(event.target.value)}
          />
        </label>
        <div className="actions">
          <button
            className="button primary"
            disabled={sitePermissionsBusy}
            onClick={() => void grantSiteAccess()}
          >
            {sitePermissionsBusy ? 'Working...' : 'Grant access'}
          </button>
          <button className="button" disabled={sitePermissionsLoading || sitePermissionsBusy} onClick={() => void refreshSitePermissions()}>
            Refresh list
          </button>
        </div>

        {sitePermissionsLoading ? (
          <div className="muted">Loading granted sites...</div>
        ) : grantedSiteOrigins.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🌐</div>
            <p className="empty-state-title">No sites added yet</p>
            <p className="empty-state-desc">Add a site above to start annotating</p>
          </div>
        ) : (
          <ul className="granted-site-list">
            {grantedSiteOrigins.map((origin) => (
              <li key={origin} className="granted-site-item">
                <code className="site-origin">{formatSiteOrigin(origin)}</code>
                <button
                  className="button"
                  disabled={sitePermissionsBusy}
                  onClick={() => void revokeSiteAccess(origin)}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <strong>Capture privacy</strong>
        </div>
        <div className="meta-line">Mask likely sensitive fields in screenshots before submission.</div>
        <div className="actions">
          <button
            className="button"
            disabled={captureRedactionBusy}
            onClick={() => void toggleCaptureRedaction()}
          >
            {getRedactionButtonText(captureRedactionBusy, captureRedactionEnabled)}
          </button>
        </div>
        <div className="meta-line">
          Redaction status: <strong>{captureRedactionEnabled ? 'Enabled' : 'Disabled'}</strong>
        </div>
      </section>

      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}

const rootNode = document.getElementById('root');
if (!rootNode) {
  throw new Error('Settings root not found.');
}

createRoot(rootNode).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
);
