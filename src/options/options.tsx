import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { maskAccessToken } from '../shared/linear-settings-client';
import { getLocalStorageItems, setLocalStorageItems } from '../shared/chrome-storage';
import { STORAGE_KEYS } from '../shared/constants';
import { useLinearConnection } from '../shared/use-linear-connection';

const REQUIRED_ORIGINS = new Set(['https://api.linear.app/*', 'https://linear.app/*']);

function isConfigurableSiteOrigin(originPattern: string): boolean {
  if (REQUIRED_ORIGINS.has(originPattern)) {
    return false;
  }
  return originPattern.startsWith('https://') || originPattern.startsWith('http://');
}

function compareSiteOrigins(left: string, right: string): number {
  return left.localeCompare(right);
}

function normalizeSiteOriginInput(value: string): { pattern: string; label: string } | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
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

function getAllPermissions(): Promise<chrome.permissions.Permissions> {
  return new Promise((resolve, reject) => {
    chrome.permissions.getAll((permissions) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(permissions);
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

async function loadCaptureRedactionEnabled(): Promise<boolean> {
  const items = await getLocalStorageItems<Record<string, unknown>>([STORAGE_KEYS.captureRedactionEnabled]);
  return items?.[STORAGE_KEYS.captureRedactionEnabled] !== false;
}

async function saveCaptureRedactionEnabled(enabled: boolean): Promise<void> {
  await setLocalStorageItems({ [STORAGE_KEYS.captureRedactionEnabled]: enabled });
}

function SettingsApp(): JSX.Element {
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
  const [sitePermissionsLoading, setSitePermissionsLoading] = React.useState(true);
  const [sitePermissionsBusy, setSitePermissionsBusy] = React.useState(false);
  const [siteAccessDraft, setSiteAccessDraft] = React.useState('');
  const [grantedSiteOrigins, setGrantedSiteOrigins] = React.useState<string[]>([]);
  const [captureRedactionEnabled, setCaptureRedactionEnabled] = React.useState(true);
  const [captureRedactionBusy, setCaptureRedactionBusy] = React.useState(false);

  const oauthRedirectUrl = React.useMemo(() => chrome.identity.getRedirectURL('linear'), []);

  const refreshSitePermissions = React.useCallback(async (): Promise<void> => {
    setSitePermissionsLoading(true);
    try {
      const allPermissions = await getAllPermissions();
      const nextOrigins = (allPermissions.origins ?? [])
        .filter(isConfigurableSiteOrigin)
        .sort(compareSiteOrigins);
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

  React.useEffect(() => {
    void refreshSitePermissions();
  }, [refreshSitePermissions]);

  React.useEffect(() => {
    void (async () => {
      try {
        setCaptureRedactionEnabled(await loadCaptureRedactionEnabled());
      } catch (loadError) {
        setFeedback(
          null,
          loadError instanceof Error ? loadError.message : 'Could not load capture privacy settings.'
        );
      }
    })();
  }, [setFeedback]);

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
        <h1 className="page-title">Notiv Settings</h1>
        <p className="page-subtitle">Linear connection and site permissions.</p>
      </header>

      <section className="panel">
        <div className="panel-head">
          <strong>Linear</strong>
          <span className={`status-pill ${connected ? 'connected' : ''}`}>{connected ? 'Connected' : 'Disconnected'}</span>
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
                ✎
              </button>
            </div>
          )
        ) : null}

        <div className="actions">
          <button className="button primary" disabled={authBusy} onClick={() => void connectWithOAuth()}>
            {authBusy ? 'Working...' : 'Connect with OAuth'}
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
          <span className="status-pill">{grantedSiteOrigins.length} granted</span>
        </div>
        <div className="meta-line">Notiv only runs on sites you explicitly allow.</div>
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
            onClick={() => {
              void (async () => {
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
              })();
            }}
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
          <div className="muted">No site permissions granted yet.</div>
        ) : (
          <ul className="granted-site-list">
            {grantedSiteOrigins.map((origin) => (
              <li key={origin} className="granted-site-item">
                <code className="site-origin">{origin.replace(/\/\*$/, '')}</code>
                <button
                  className="button"
                  disabled={sitePermissionsBusy}
                  onClick={() => {
                    void (async () => {
                      setSitePermissionsBusy(true);
                      setFeedback(null, null);
                      try {
                        await removeOriginPermission(origin);
                        await refreshSitePermissions();
                        setFeedback(`Removed site access for ${origin.replace(/\/\*$/, '')}.`, null);
                      } catch (permissionError) {
                        setFeedback(
                          null,
                          permissionError instanceof Error ? permissionError.message : 'Could not remove site access.'
                        );
                      } finally {
                        setSitePermissionsBusy(false);
                      }
                    })();
                  }}
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
            onClick={() => {
              const next = !captureRedactionEnabled;
              setCaptureRedactionBusy(true);
              setFeedback(null, null);
              void saveCaptureRedactionEnabled(next)
                .then(() => {
                  setCaptureRedactionEnabled(next);
                  setFeedback(
                    next ? 'Capture redaction enabled.' : 'Capture redaction disabled.',
                    null
                  );
                })
                .catch((saveError) => {
                  setFeedback(
                    null,
                    saveError instanceof Error ? saveError.message : 'Could not update capture privacy settings.'
                  );
                })
                .finally(() => {
                  setCaptureRedactionBusy(false);
                });
            }}
          >
            {captureRedactionBusy
              ? 'Working...'
              : captureRedactionEnabled
                ? 'Disable redaction'
                : 'Enable redaction'}
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
