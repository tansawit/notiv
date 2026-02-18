import type { BackgroundResponse, BackgroundToContentMessage, ContentToBackgroundMessage } from '../shared/messages';
import type { Annotation, LinearSettings } from '../shared/types';
import { ALLOW_LINEAR_PAT_FALLBACK } from '../shared/feature-flags';
import { STORAGE_KEYS } from '../shared/constants';
import { getLocalStorageItems, getSessionStorageItems, setSessionStorageItems } from '../shared/chrome-storage';
import { EMPTY_LINEAR_RESOURCES } from '../shared/linear-resources';
import { resolveSiteOriginPermission } from '../shared/site-origin';
import { createLinearGroupedIssue, createLinearIssue, getLinearWorkspaceResources, runLinearOAuthFlow } from './linear';
import { captureElementScreenshot, captureRegionScreenshot, captureVisibleScreenshot } from './screenshot';
import { captureGroupedScreenshot } from './capture-grouped';
import { clearLinearAuth, getLinearSettings, saveLinearSettings } from './storage';
import { addToSubmissionHistory } from './submission-history';

const activePickerTabs = new Set<number>();
const activeToolbarTabs = new Set<number>();
const SESSION_KEYS = {
  pickerTabs: 'notisActivePickerTabs',
  toolbarTabs: 'notisActiveToolbarTabs'
} as const;

type TogglePayload = { visible: boolean } | { active: boolean };
type CapturePreparePayload = Extract<BackgroundToContentMessage, { type: 'capturePrepare' }>['payload'];

interface RuntimeToggleConfig {
  tabs: Set<number>;
  messageType: 'toolbarVisibilityChanged' | 'pickerActivationChanged';
  unavailableMessage: string;
  getPayload: (value: boolean) => TogglePayload;
}

const TOOLBAR_TOGGLE_CONFIG: RuntimeToggleConfig = {
  tabs: activeToolbarTabs,
  messageType: 'toolbarVisibilityChanged',
  unavailableMessage: 'Toolbar is unavailable on this page. Open a regular http/https page and try again.',
  getPayload: (visible) => ({ visible })
};

const PICKER_TOGGLE_CONFIG: RuntimeToggleConfig = {
  tabs: activePickerTabs,
  messageType: 'pickerActivationChanged',
  unavailableMessage: 'Picker is unavailable on this page. Open a regular http/https page and try again.',
  getPayload: (active) => ({ active })
};

function resolveContentScriptFile(): string {
  const fallback = 'src/content/index.ts';
  const entries = chrome.runtime.getManifest().content_scripts ?? [];
  for (const entry of entries) {
    const file = entry.js?.[0];
    if (file?.trim()) {
      return file;
    }
  }
  return fallback;
}

async function ensureContentScriptReady(tabId: number): Promise<void> {
  const pingContentScript = async (): Promise<boolean> => {
    try {
      const pingResponse = await chrome.tabs.sendMessage(tabId, { type: 'notisPing' });
      return Boolean((pingResponse as { ok?: boolean } | undefined)?.ok);
    } catch {
      return false;
    }
  };

  const waitForContentScriptReady = async (
    timeoutMs = 1200,
    intervalMs = 80
  ): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
      if (await pingContentScript()) {
        return true;
      }
      if (Date.now() + intervalMs > deadline) {
        break;
      }
      await new Promise<void>((resolve) => {
        setTimeout(resolve, intervalMs);
      });
    }
    return false;
  };

  if (await pingContentScript()) {
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: [resolveContentScriptFile()]
  });

  if (!(await waitForContentScriptReady())) {
    throw new Error('Notis could not start on this page. Refresh and try again.');
  }
}

async function ensureSiteAccessForTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  const permission = resolveSiteOriginPermission(tab.url);
  if (!permission) {
    throw new Error('Notis works only on regular http/https pages.');
  }

  const hasAccess = await chrome.permissions.contains({ origins: [permission.pattern] });
  if (!hasAccess) {
    let granted = false;
    try {
      granted = await chrome.permissions.request({ origins: [permission.pattern] });
    } catch {
      granted = false;
    }

    if (!granted) {
      throw new Error(`Site access was not granted for ${permission.label}. Allow access and try again.`);
    }
  }

  await ensureContentScriptReady(tabId);
}

async function persistRuntimeState(): Promise<void> {
  await Promise.all([
    setSessionStorageItems(SESSION_KEYS.pickerTabs, Array.from(activePickerTabs)),
    setSessionStorageItems(SESSION_KEYS.toolbarTabs, Array.from(activeToolbarTabs))
  ]).catch(() => undefined);
}

async function hydrateRuntimeState(): Promise<void> {
  try {
    const [pickerTabs, toolbarTabs, openTabs] = await Promise.all([
      getSessionStorageItems<number[]>(SESSION_KEYS.pickerTabs),
      getSessionStorageItems<number[]>(SESSION_KEYS.toolbarTabs),
      chrome.tabs.query({})
    ]);
    const activeTabIds = new Set(openTabs.map((tab) => tab.id).filter((tabId): tabId is number => typeof tabId === 'number'));

    activePickerTabs.clear();
    for (const tabId of pickerTabs ?? []) {
      if (activeTabIds.has(tabId)) {
        activePickerTabs.add(tabId);
      }
    }

    activeToolbarTabs.clear();
    for (const tabId of toolbarTabs ?? []) {
      if (activeTabIds.has(tabId)) {
        activeToolbarTabs.add(tabId);
      }
    }
  } catch {
    activePickerTabs.clear();
    activeToolbarTabs.clear();
  }
}

function isExtensionPageSender(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id) {
    return false;
  }

  const extensionBaseUrl = chrome.runtime.getURL('');
  if (typeof sender.url === 'string') {
    return sender.url.startsWith(extensionBaseUrl);
  }

  if (typeof sender.origin === 'string') {
    return sender.origin.startsWith(extensionBaseUrl.slice(0, -1));
  }

  return !sender.tab;
}

function sanitizeSettingsForContent(settings: LinearSettings): LinearSettings {
  return {
    ...settings,
    accessToken: settings.accessToken?.trim() ? '__connected__' : '',
    linearOAuthClientId: undefined,
    refreshToken: undefined,
    accessTokenExpiresAt: undefined
  };
}

async function sendTabToggleMessage(tabId: number, config: RuntimeToggleConfig, value: boolean): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: config.messageType,
      payload: config.getPayload(value)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Receiving end does not exist')) {
      throw new Error(config.unavailableMessage);
    }
    throw error;
  }
}

async function setRuntimeToggleState(tabId: number, value: boolean, config: RuntimeToggleConfig): Promise<void> {
  const hadValue = config.tabs.has(tabId);
  if (value) {
    config.tabs.add(tabId);
  } else {
    config.tabs.delete(tabId);
  }

  try {
    await sendTabToggleMessage(tabId, config, value);
    await persistRuntimeState();
  } catch (error) {
    if (hadValue) {
      config.tabs.add(tabId);
    } else {
      config.tabs.delete(tabId);
    }
    await persistRuntimeState();
    throw error;
  }
}

async function setToolbar(tabId: number, visible: boolean): Promise<void> {
  await setRuntimeToggleState(tabId, visible, TOOLBAR_TOGGLE_CONFIG);
}

async function setPicker(tabId: number, active: boolean): Promise<void> {
  await setRuntimeToggleState(tabId, active, PICKER_TOGGLE_CONFIG);
}

function getSenderTabId(sender: chrome.runtime.MessageSender, context: 'picker' | 'toolbar' | 'capture'): number {
  const tabId = sender.tab?.id;
  if (tabId) {
    return tabId;
  }

  if (context === 'picker') {
    throw new Error('Could not resolve source tab for picker update.');
  }
  if (context === 'toolbar') {
    throw new Error('Could not resolve source tab for toolbar update.');
  }
  throw new Error('Could not resolve current tab.');
}

function toIssueCreateResponse(issue: { identifier: string; url: string; id: string }): BackgroundResponse {
  return {
    ok: true,
    data: {
      identifier: issue.identifier,
      url: issue.url,
      issueId: issue.id
    }
  };
}

async function withCapturePreparation<T>(
  tabId: number,
  payload: CapturePreparePayload | undefined,
  capture: () => Promise<T>
): Promise<T> {
  try {
    if (payload) {
      await chrome.tabs.sendMessage(tabId, {
        type: 'capturePrepare',
        payload
      });
    }
  } catch {
    // Continue even if content script prepare hook is unavailable.
  }

  try {
    return await capture();
  } finally {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'captureRestore' });
    } catch {
      // Best-effort UI restore.
    }
  }
}

async function togglePicker(tabId: number): Promise<boolean> {
  const isActive = activePickerTabs.has(tabId);
  const next = !isActive;
  await setPicker(tabId, next);
  return next;
}

async function captureAnnotationWithScreenshot(
  tabId: number,
  windowId: number | undefined,
  annotationBase: Omit<Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'>
): Promise<Annotation> {
  const captures = await withCapturePreparation(
    tabId,
    {
      boundingBox: annotationBase.boundingBox,
      marker: {
        x: annotationBase.x,
        y: annotationBase.y,
        text: annotationBase.comment,
        color: annotationBase.highlightColor
      }
    },
    () =>
      captureElementScreenshot({
        windowId,
        boundingBox: annotationBase.boundingBox ?? { x: 0, y: 0, width: 1, height: 1 },
        devicePixelRatio: annotationBase.viewport?.devicePixelRatio ?? 1
      })
  );

  return {
    ...annotationBase,
    screenshot: captures.cropped,
    screenshotViewport: captures.full
  };
}

void hydrateRuntimeState();

async function isDirectActivationReady(): Promise<boolean> {
  const data = await getLocalStorageItems<Record<string, unknown>>([
    STORAGE_KEYS.linearAccessToken
  ]);

  const accessToken = data[STORAGE_KEYS.linearAccessToken];
  const hasAccessToken = Boolean(
    typeof accessToken === 'string' && accessToken.trim()
  );

  if (!hasAccessToken) {
    return false;
  }

  const permissions = await chrome.permissions.getAll();
  const hasGrantedOrigins = (permissions.origins ?? []).some(
    (origin) => origin !== 'https://api.linear.app/*' && origin !== 'https://linear.app/*'
  );

  return hasGrantedOrigins;
}

async function updateActionPopupState(): Promise<void> {
  const ready = await isDirectActivationReady();
  if (ready) {
    await chrome.action.setPopup({ popup: '' });
  } else {
    await chrome.action.setPopup({ popup: 'src/popup/index.html' });
  }
}

void updateActionPopupState();

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    await ensureSiteAccessForTab(tab.id);
    await setToolbar(tab.id, true);
    await togglePicker(tab.id);
  } catch {
    await chrome.action.setPopup({ popup: 'src/popup/index.html' });
    await chrome.action.openPopup();
  }
});

chrome.permissions.onAdded.addListener(() => {
  void updateActionPopupState();
});

chrome.permissions.onRemoved.addListener(() => {
  void updateActionPopupState();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;

  if (
    STORAGE_KEYS.linearAccessToken in changes ||
    STORAGE_KEYS.onboardingCompleted in changes
  ) {
    void updateActionPopupState();
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'activate') {
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      return;
    }

    await ensureSiteAccessForTab(tab.id);
    await togglePicker(tab.id);
  } catch {
    // Ignore command activation failures on unsupported browser pages.
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  activePickerTabs.delete(tabId);
  activeToolbarTabs.delete(tabId);
  void persistRuntimeState();
});

async function dispatchRuntimeMessage(
  message: ContentToBackgroundMessage,
  sender: chrome.runtime.MessageSender
): Promise<BackgroundResponse> {
  const trustedSender = isExtensionPageSender(sender);

  switch (message.type) {
    case 'activatePicker': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('No active tab available.');
      }
      await ensureSiteAccessForTab(tab.id);
      await setToolbar(tab.id, true);
      const active = await togglePicker(tab.id);
      return { ok: true, data: { active } };
    }
    case 'setPickerActive': {
      const tabId = getSenderTabId(sender, 'picker');
      await setPicker(tabId, message.payload.active);
      return { ok: true, data: { active: message.payload.active } };
    }
    case 'setToolbarVisible': {
      const tabId = getSenderTabId(sender, 'toolbar');
      await setToolbar(tabId, message.payload.visible);
      return { ok: true, data: { visible: message.payload.visible } };
    }
    case 'openSettingsPage': {
      await chrome.runtime.openOptionsPage();
      return { ok: true };
    }
    case 'refreshActionPopupState': {
      await updateActionPopupState();
      return { ok: true };
    }
    case 'checkDirectActivationReady': {
      const ready = await isDirectActivationReady();
      return { ok: true, data: { ready } };
    }
    case 'linearSettingsGet': {
      const settings = await getLinearSettings();
      return {
        ok: true,
        data: trustedSender ? settings : sanitizeSettingsForContent(settings)
      };
    }
    case 'linearResourcesGet': {
      const settings = await getLinearSettings();
      const rawExplicitAccessToken = trustedSender ? message.payload?.accessToken?.trim() : undefined;
      if (rawExplicitAccessToken && !ALLOW_LINEAR_PAT_FALLBACK) {
        throw new Error('Personal API token fallback is disabled. Connect with OAuth.');
      }
      const explicitAccessToken = ALLOW_LINEAR_PAT_FALLBACK ? rawExplicitAccessToken : undefined;
      const hasStoredAccessToken = Boolean(settings.accessToken?.trim());
      if (!explicitAccessToken && !hasStoredAccessToken) {
        return { ok: true, data: EMPTY_LINEAR_RESOURCES };
      }

      const resources = explicitAccessToken
        ? await getLinearWorkspaceResources(explicitAccessToken)
        : await getLinearWorkspaceResources(settings);
      return { ok: true, data: resources };
    }
    case 'linearSettingsSave': {
      if (!trustedSender) {
        throw new Error('Settings updates must be made from extension settings.');
      }
      if (message.payload.accessToken !== undefined && !ALLOW_LINEAR_PAT_FALLBACK) {
        throw new Error('Personal API token fallback is disabled. Connect with OAuth.');
      }
      await saveLinearSettings(message.payload);
      const settings = await getLinearSettings();
      return { ok: true, data: settings };
    }
    case 'linearAuthDisconnect': {
      if (!trustedSender) {
        throw new Error('Authentication changes must be made from extension settings.');
      }
      await clearLinearAuth();
      const settings = await getLinearSettings();
      return { ok: true, data: settings };
    }
    case 'linearAuthStart': {
      if (!trustedSender) {
        throw new Error('Authentication must be initiated from extension settings.');
      }
      const currentSettings = await getLinearSettings();
      const oauth = await runLinearOAuthFlow(currentSettings);
      await saveLinearSettings({
        accessToken: oauth.accessToken,
        refreshToken: oauth.refreshToken,
        accessTokenExpiresAt: oauth.accessTokenExpiresAt
      });
      const updatedSettings = await getLinearSettings();
      return { ok: true, data: updatedSettings };
    }
    case 'captureAndCreateIssue': {
      const tabId = getSenderTabId(sender, 'capture');
      const windowId = sender.tab?.windowId;
      const annotationBase = message.payload.annotation;
      const annotation = await captureAnnotationWithScreenshot(tabId, windowId, annotationBase);
      const settings = await getLinearSettings();
      const issue = await createLinearIssue(annotation, settings, message.payload.overrides);
      return toIssueCreateResponse(issue);
    }
    case 'captureAndCreateGroupedIssue': {
      const tabId = getSenderTabId(sender, 'capture');
      const windowId = sender.tab?.windowId;
      const annotations = message.payload.annotations;
      if (annotations.length === 0) {
        throw new Error('No notes to submit.');
      }

      const items = await chrome.storage.local.get(STORAGE_KEYS.showNoteTextInScreenshot);
      const showNoteText = items[STORAGE_KEYS.showNoteTextInScreenshot] !== false;

      const fullScreenshot = await captureGroupedScreenshot({
        tabId,
        windowId,
        annotations,
        showNoteText,
        withCapturePreparation,
        captureRegionScreenshot,
        captureVisibleScreenshot
      });

      const settings = await getLinearSettings();
      const issue = await createLinearGroupedIssue(annotations, fullScreenshot, settings, message.payload.overrides);

      const tab = await chrome.tabs.get(tabId);
      const pageDomain = tab.url ? new URL(tab.url).hostname : 'unknown';
      const firstNote = annotations[0];
      const firstNotePreview = firstNote?.comment?.slice(0, 60) || '';

      void addToSubmissionHistory({
        id: issue.id,
        identifier: issue.identifier,
        url: issue.url,
        timestamp: Date.now(),
        noteCount: annotations.length,
        firstNotePreview,
        pageDomain
      });

      return toIssueCreateResponse(issue);
    }
    case 'captureAndCopyScreenshot': {
      const tabId = getSenderTabId(sender, 'capture');
      const windowId = sender.tab?.windowId;
      const annotations = message.payload.annotations;
      if (annotations.length === 0) {
        throw new Error('No notes to capture.');
      }

      const fullScreenshot = await captureGroupedScreenshot({
        tabId,
        windowId,
        annotations,
        showNoteText: true,
        withCapturePreparation,
        captureRegionScreenshot: (input) =>
          captureRegionScreenshot({
            ...input,
            outputProfile: 'clipboard'
          }),
        captureVisibleScreenshot: (input) =>
          captureVisibleScreenshot({
            ...input,
            outputProfile: 'clipboard'
          })
      });

      return { ok: true, data: fullScreenshot };
    }
    default:
      return { ok: false, error: 'Unsupported message type.' };
  }
}

chrome.runtime.onMessage.addListener((message: ContentToBackgroundMessage, sender, sendResponse) => {
  const handleMessage = async (): Promise<void> => {
    try {
      const response = await dispatchRuntimeMessage(message, sender);
      sendResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error in background worker.';
      sendResponse({ ok: false, error: message } satisfies BackgroundResponse);
    }
  };

  void handleMessage();

  return true;
});
