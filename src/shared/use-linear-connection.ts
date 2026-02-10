import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LinearWorkspaceResources } from './types';
import { ALLOW_LINEAR_PAT_FALLBACK } from './feature-flags';
import {
  disconnectLinearOAuth,
  EMPTY_RESOURCES,
  fetchLinearResources,
  fetchLinearSettings,
  saveLinearAccessToken,
  saveLinearOAuthClientId,
  startLinearOAuth,
  type BasicLinearSettings
} from './linear-settings-client';

export interface UseLinearConnectionResult {
  loading: boolean;
  authBusy: boolean;
  loadingResources: boolean;
  error: string | null;
  notice: string | null;
  settings: BasicLinearSettings;
  resources: LinearWorkspaceResources;
  allowPatFallback: boolean;
  tokenDraft: string;
  tokenEditing: boolean;
  oauthClientIdDraft: string;
  connected: boolean;
  setTokenDraft: (value: string) => void;
  setTokenEditing: (value: boolean) => void;
  setOauthClientIdDraft: (value: string) => void;
  setFeedback: (notice: string | null, error: string | null) => void;
  saveToken: () => Promise<void>;
  saveOAuthClientId: (value?: string) => Promise<void>;
  connectWithOAuth: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshResources: () => Promise<void>;
}

export function useLinearConnection(): UseLinearConnectionResult {
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settings, setSettings] = useState<BasicLinearSettings>({
    accessToken: '',
    linearOAuthClientId: ''
  });
  const [resources, setResources] = useState<LinearWorkspaceResources>(EMPTY_RESOURCES);
  const [tokenDraft, setTokenDraft] = useState('');
  const [tokenEditing, setTokenEditing] = useState(true);
  const [oauthClientIdDraft, setOauthClientIdDraft] = useState('');

  const connected = useMemo(() => Boolean(settings.accessToken.trim()), [settings.accessToken]);

  const setFeedback = useCallback((nextNotice: string | null, nextError: string | null): void => {
    setNotice(nextNotice);
    setError(nextError);
  }, []);

  const loadResources = useCallback(async (accessToken: string): Promise<void> => {
    if (!accessToken.trim()) {
      setResources(EMPTY_RESOURCES);
      return;
    }

    setLoadingResources(true);
    try {
      setResources(await fetchLinearResources());
    } catch (resourceError) {
      setResources(EMPTY_RESOURCES);
      setFeedback(null, resourceError instanceof Error ? resourceError.message : 'Could not load workspace data.');
    } finally {
      setLoadingResources(false);
    }
  }, [setFeedback]);

  useEffect(() => {
    void (async () => {
      try {
        const normalized = await fetchLinearSettings();
        setSettings(normalized);
        setTokenDraft(normalized.accessToken);
        setTokenEditing(!normalized.accessToken.trim());
        setOauthClientIdDraft(normalized.linearOAuthClientId);
      } catch (loadError) {
        setFeedback(null, loadError instanceof Error ? loadError.message : 'Could not load settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, [setFeedback]);

  useEffect(() => {
    if (!loading) {
      void loadResources(settings.accessToken);
    }
  }, [loading, settings.accessToken, loadResources]);

  const saveToken = async (): Promise<void> => {
    if (!ALLOW_LINEAR_PAT_FALLBACK) {
      setFeedback(null, 'Personal API token fallback is disabled. Connect with OAuth.');
      return;
    }

    const accessToken = tokenDraft.trim();
    if (!accessToken) {
      setFeedback(null, 'Enter a Linear API token.');
      return;
    }

    setAuthBusy(true);
    setFeedback(null, null);

    try {
      const normalized = await saveLinearAccessToken(accessToken);
      setSettings(normalized);
      setTokenDraft(normalized.accessToken);
      setTokenEditing(false);
      setFeedback('Token saved.', null);
    } catch (tokenError) {
      setFeedback(null, tokenError instanceof Error ? tokenError.message : 'Could not save token.');
    } finally {
      setAuthBusy(false);
    }
  };

  const connectWithOAuth = async (): Promise<void> => {
    setAuthBusy(true);
    setFeedback(null, null);

    try {
      const normalized = await startLinearOAuth();
      setSettings(normalized);
      setTokenDraft(normalized.accessToken);
      setTokenEditing(false);
      setFeedback('Connected to Linear.', null);
    } catch (connectError) {
      setFeedback(null, connectError instanceof Error ? connectError.message : 'Could not connect with OAuth.');
    } finally {
      setAuthBusy(false);
    }
  };

  const saveOAuthClientId = async (value?: string): Promise<void> => {
    setAuthBusy(true);
    setFeedback(null, null);
    const normalizedValue = value === undefined ? oauthClientIdDraft.trim() : value.trim();

    try {
      const normalized = await saveLinearOAuthClientId(normalizedValue);
      setSettings(normalized);
      setOauthClientIdDraft(normalized.linearOAuthClientId);
      setFeedback(
        normalized.linearOAuthClientId.trim()
          ? 'OAuth client ID override saved.'
          : 'OAuth client ID override cleared. Using bundled default.',
        null
      );
    } catch (oauthError) {
      setFeedback(
        null,
        oauthError instanceof Error ? oauthError.message : 'Could not save OAuth client ID override.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    setAuthBusy(true);
    setFeedback(null, null);

    try {
      const normalized = await disconnectLinearOAuth();
      setSettings(normalized);
      setResources(EMPTY_RESOURCES);
      setTokenDraft('');
      setTokenEditing(true);
      setOauthClientIdDraft(normalized.linearOAuthClientId);
      setFeedback('Disconnected.', null);
    } catch (disconnectError) {
      setFeedback(null, disconnectError instanceof Error ? disconnectError.message : 'Could not disconnect.');
    } finally {
      setAuthBusy(false);
    }
  };

  const refreshResources = async (): Promise<void> => {
    setFeedback(null, null);
    await loadResources(settings.accessToken);
  };

  return {
    loading,
    authBusy,
    loadingResources,
    error,
    notice,
    settings,
    resources,
    allowPatFallback: ALLOW_LINEAR_PAT_FALLBACK,
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
  };
}
