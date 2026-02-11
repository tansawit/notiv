import type { BackgroundResponse, ContentToBackgroundMessage } from '../shared/messages';
import type { Annotation, BoundingBox, LinearSettings } from '../shared/types';
import { ALLOW_LINEAR_PAT_FALLBACK } from '../shared/feature-flags';
import { getSessionStorageItems, setSessionStorageItems } from '../shared/chrome-storage';
import { createLinearGroupedIssue, createLinearIssue, getLinearWorkspaceResources, runLinearOAuthFlow } from './linear';
import { captureElementScreenshot, captureRegionScreenshot, captureVisibleScreenshot } from './screenshot';
import { clearLinearAuth, getLinearSettings, saveLinearSettings } from './storage';

const activePickerTabs = new Set<number>();
const activeToolbarTabs = new Set<number>();
const SESSION_KEYS = {
  pickerTabs: 'notivActivePickerTabs',
  toolbarTabs: 'notivActiveToolbarTabs'
} as const;

interface TabSitePermission {
  pattern: string;
  label: string;
}

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

function resolveTabSitePermission(urlValue: string | undefined): TabSitePermission | null {
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

  const host = parsed.hostname;
  if (!host) {
    return null;
  }

  return {
    pattern: `${parsed.protocol}//${host}/*`,
    label: parsed.origin
  };
}

async function ensureContentScriptReady(tabId: number): Promise<void> {
  const pingContentScript = async (): Promise<boolean> => {
    try {
      const pingResponse = await chrome.tabs.sendMessage(tabId, { type: 'notivPing' });
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
    throw new Error('Notiv could not start on this page. Refresh and try again.');
  }
}

async function ensureSiteAccessForTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  const permission = resolveTabSitePermission(tab.url);
  if (!permission) {
    throw new Error('Notiv works only on regular http/https pages.');
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

async function notifyToolbarState(tabId: number, visible: boolean): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'toolbarVisibilityChanged',
      payload: { visible }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Receiving end does not exist')) {
      throw new Error(
        'Toolbar is unavailable on this page. Open a regular http/https page and try again.'
      );
    }
    throw error;
  }
}

async function setToolbar(tabId: number, visible: boolean): Promise<void> {
  const hadToolbar = activeToolbarTabs.has(tabId);
  if (visible) {
    activeToolbarTabs.add(tabId);
  } else {
    activeToolbarTabs.delete(tabId);
  }

  try {
    await notifyToolbarState(tabId, visible);
    await persistRuntimeState();
  } catch (error) {
    if (hadToolbar) {
      activeToolbarTabs.add(tabId);
    } else {
      activeToolbarTabs.delete(tabId);
    }
    await persistRuntimeState();
    throw error;
  }
}

async function notifyPickerState(tabId: number, active: boolean): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'pickerActivationChanged',
      payload: { active }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Receiving end does not exist')) {
      throw new Error(
        'Picker is unavailable on this page. Open a regular http/https page and try again.'
      );
    }
    throw error;
  }
}

async function setPicker(tabId: number, active: boolean): Promise<void> {
  const hadPicker = activePickerTabs.has(tabId);
  if (active) {
    activePickerTabs.add(tabId);
  } else {
    activePickerTabs.delete(tabId);
  }

  try {
    await notifyPickerState(tabId, active);
    await persistRuntimeState();
  } catch (error) {
    if (hadPicker) {
      activePickerTabs.add(tabId);
    } else {
      activePickerTabs.delete(tabId);
    }
    await persistRuntimeState();
    throw error;
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
  let captures: Awaited<ReturnType<typeof captureElementScreenshot>>;
  try {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'capturePrepare',
        payload: {
          boundingBox: annotationBase.boundingBox,
          marker: {
            x: annotationBase.x,
            y: annotationBase.y,
            text: annotationBase.comment,
            color: annotationBase.highlightColor
          }
        }
      });
    } catch {
      // Continue even if content script prepare hook is unavailable.
    }

    captures = await captureElementScreenshot({
      windowId,
      boundingBox: annotationBase.boundingBox ?? { x: 0, y: 0, width: 1, height: 1 },
      devicePixelRatio: annotationBase.viewport?.devicePixelRatio ?? 1
    });
  } finally {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'captureRestore' });
    } catch {
      // Best-effort UI restore.
    }
  }

  return {
    ...annotationBase,
    screenshot: captures.cropped,
    screenshotViewport: captures.full
  };
}

function computeGroupedCaptureBounds(annotations: Array<Omit<Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'>>): BoundingBox | null {
  if (annotations.length === 0) {
    return null;
  }

  const fallbackBoxes = annotations.map((annotation) => {
    if (annotation.boundingBox) {
      return annotation.boundingBox;
    }
    return {
      x: annotation.x - 60,
      y: annotation.y - 40,
      width: 120,
      height: 80
    } satisfies BoundingBox;
  });

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const box of fallbackBoxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  const pad = 120;
  const firstViewport = annotations[0].viewport;
  const viewportWidth = firstViewport?.width;
  const viewportHeight = firstViewport?.height;

  const clampedMinX = Math.max(0, minX - pad);
  const clampedMinY = Math.max(0, minY - pad);
  const clampedMaxX = viewportWidth ? Math.min(viewportWidth, maxX + pad) : maxX + pad;
  const clampedMaxY = viewportHeight ? Math.min(viewportHeight, maxY + pad) : maxY + pad;

  return {
    x: clampedMinX,
    y: clampedMinY,
    width: Math.max(1, clampedMaxX - clampedMinX),
    height: Math.max(1, clampedMaxY - clampedMinY)
  };
}

void hydrateRuntimeState();

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

  if (message.type === 'activatePicker') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      throw new Error('No active tab available.');
    }
    await ensureSiteAccessForTab(tab.id);
    await setToolbar(tab.id, true);
    const active = await togglePicker(tab.id);
    return { ok: true, data: { active } };
  }

  if (message.type === 'setPickerActive') {
    const tabId = sender.tab?.id;
    if (!tabId) {
      throw new Error('Could not resolve source tab for picker update.');
    }
    await setPicker(tabId, message.payload.active);
    return { ok: true, data: { active: message.payload.active } };
  }

  if (message.type === 'setToolbarVisible') {
    const tabId = sender.tab?.id;
    if (!tabId) {
      throw new Error('Could not resolve source tab for toolbar update.');
    }
    await setToolbar(tabId, message.payload.visible);
    return { ok: true, data: { visible: message.payload.visible } };
  }

  if (message.type === 'openSettingsPage') {
    await chrome.runtime.openOptionsPage();
    return { ok: true };
  }

  if (message.type === 'linearSettingsGet') {
    const settings = await getLinearSettings();
    return {
      ok: true,
      data: trustedSender ? settings : sanitizeSettingsForContent(settings)
    };
  }

  if (message.type === 'linearResourcesGet') {
    const settings = await getLinearSettings();
    const rawExplicitAccessToken = trustedSender ? message.payload?.accessToken?.trim() : undefined;
    if (rawExplicitAccessToken && !ALLOW_LINEAR_PAT_FALLBACK) {
      throw new Error('Personal API token fallback is disabled. Connect with OAuth.');
    }
    const explicitAccessToken = ALLOW_LINEAR_PAT_FALLBACK ? rawExplicitAccessToken : undefined;
    const hasStoredAccessToken = Boolean(settings.accessToken?.trim());
    if (!explicitAccessToken && !hasStoredAccessToken) {
      return {
        ok: true,
        data: {
          viewerName: undefined,
          organizationName: undefined,
          teams: [],
          projects: [],
          labels: [],
          users: []
        }
      };
    }

    const resources = explicitAccessToken
      ? await getLinearWorkspaceResources(explicitAccessToken)
      : await getLinearWorkspaceResources(settings);
    return { ok: true, data: resources };
  }

  if (message.type === 'linearSettingsSave') {
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

  if (message.type === 'linearAuthDisconnect') {
    if (!trustedSender) {
      throw new Error('Authentication changes must be made from extension settings.');
    }
    await clearLinearAuth();
    const settings = await getLinearSettings();
    return { ok: true, data: settings };
  }

  if (message.type === 'linearAuthStart') {
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

  if (message.type === 'captureAndCreateIssue') {
    const tabId = sender.tab?.id;
    if (!tabId) {
      throw new Error('Could not resolve current tab.');
    }

    const windowId = sender.tab?.windowId;
    const annotationBase = message.payload.annotation;
    const annotation = await captureAnnotationWithScreenshot(tabId, windowId, annotationBase);

    const settings = await getLinearSettings();
    const issue = await createLinearIssue(annotation, settings, message.payload.overrides);

    return {
      ok: true,
      data: {
        identifier: issue.identifier,
        url: issue.url,
        issueId: issue.id
      }
    };
  }

  if (message.type === 'captureAndCreateGroupedIssue') {
    const tabId = sender.tab?.id;
    if (!tabId) {
      throw new Error('Could not resolve current tab.');
    }
    const windowId = sender.tab?.windowId;
    const annotations = message.payload.annotations;
    if (annotations.length === 0) {
      throw new Error('No notes to submit.');
    }
    let fullScreenshot = '';
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'capturePrepare',
        payload: {
          highlights: annotations
            .map((annotation) =>
              annotation.boundingBox ? { ...annotation.boundingBox, color: annotation.highlightColor } : null
            )
            .filter(
              (box): box is { x: number; y: number; width: number; height: number; color: Annotation['highlightColor'] } =>
                Boolean(box)
            ),
          markers: annotations.map((annotation, index) => ({
            x: annotation.x,
            y: annotation.y,
            text: annotation.comment,
            index: index + 1,
            color: annotation.highlightColor
          }))
        }
      });
    } catch {
      // Continue even if content script prepare hook is unavailable.
    }

    try {
      const groupedBounds = computeGroupedCaptureBounds(annotations);
      if (groupedBounds) {
        fullScreenshot = await captureRegionScreenshot({
          windowId,
          boundingBox: groupedBounds,
          devicePixelRatio: annotations[0]?.viewport?.devicePixelRatio ?? 1
        });
      } else {
        fullScreenshot = await captureVisibleScreenshot({ windowId });
      }
    } finally {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'captureRestore' });
      } catch {
        // Best-effort UI restore.
      }
    }

    const settings = await getLinearSettings();
    const issue = await createLinearGroupedIssue(annotations, fullScreenshot, settings, message.payload.overrides);

    return {
      ok: true,
      data: {
        identifier: issue.identifier,
        url: issue.url,
        issueId: issue.id
      }
    };
  }

  return { ok: false, error: 'Unsupported message type.' };
}

chrome.runtime.onMessage.addListener((message: ContentToBackgroundMessage, sender, sendResponse) => {
  void (async () => {
    try {
      const response = await dispatchRuntimeMessage(message, sender);
      sendResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error in background worker.';
      sendResponse({ ok: false, error: message } satisfies BackgroundResponse);
    }
  })();

  return true;
});
