import type { BackgroundToContentMessage } from '../shared/messages';
import type { BoundingBox } from '../shared/types';

interface RuntimeRouterDependencies {
  getSelectedElement: () => Element | null;
  getSelectedClickPoint: () => { x: number; y: number } | null;
  prepareCaptureUi: (input: {
    boundingBox?: BoundingBox;
    marker?: {
      x: number;
      y: number;
      text?: string;
      index?: number;
      color?: import('../shared/types').HighlightColor;
    };
    highlights?: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      color?: import('../shared/types').HighlightColor;
    }>;
    markers?: Array<{
      x: number;
      y: number;
      text?: string;
      index?: number;
      color?: import('../shared/types').HighlightColor;
    }>;
    fallbackBoundingBox?: BoundingBox;
    fallbackMarker?: { x: number; y: number };
    showNoteText?: boolean;
  }) => Promise<void>;
  restoreCaptureUi: () => void;
  setToolbarVisible: (visible: boolean) => void;
  setPickerActive: (active: boolean) => void;
  unifiedBadge: {
    setVisible: (visible: boolean) => void;
    showSuccessPill: (issue?: { identifier?: string; url?: string; noteCount?: number; text?: string }) => void;
    showErrorPill: (message: string) => void;
  };
}

function resolveFallbackBoundingBox(selectedElement: Element | null): BoundingBox | undefined {
  if (!selectedElement) {
    return undefined;
  }

  const rect = selectedElement.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
}

export function createContentRuntimeMessageHandler(
  deps: RuntimeRouterDependencies
): (
  message: BackgroundToContentMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => boolean | void {
  return (message, _sender, sendResponse) => {
    switch (message.type) {
      case 'notisPing': {
        sendResponse({ ok: true });
        return;
      }
      case 'capturePrepare': {
        const fallbackBoundingBox = resolveFallbackBoundingBox(deps.getSelectedElement());
        const fallbackMarker = deps.getSelectedClickPoint() ?? undefined;

        void deps
          .prepareCaptureUi({
            boundingBox: message.payload.boundingBox,
            marker: message.payload.marker,
            highlights: message.payload.highlights,
            markers: message.payload.markers,
            showNoteText: message.payload.showNoteText,
            fallbackBoundingBox,
            fallbackMarker
          })
          .then(() => {
            sendResponse({ ok: true });
          });

        return true;
      }
      case 'captureRestore': {
        deps.restoreCaptureUi();
        sendResponse({ ok: true });
        return;
      }
      case 'toolbarVisibilityChanged': {
        deps.setToolbarVisible(message.payload.visible);
        sendResponse({ ok: true });
        return;
      }
      case 'pickerActivationChanged': {
        deps.setToolbarVisible(true);
        deps.setPickerActive(message.payload.active);
        sendResponse({ ok: true });
        return;
      }
      case 'issueCreated': {
        deps.unifiedBadge.setVisible(true);
        deps.unifiedBadge.showSuccessPill({
          identifier: message.payload.identifier,
          url: message.payload.url
        });
        sendResponse({ ok: true });
        return;
      }
      case 'issueCreationFailed': {
        deps.unifiedBadge.setVisible(true);
        deps.unifiedBadge.showErrorPill(message.payload.message);
        sendResponse({ ok: true });
        return;
      }
      default: {
        sendResponse({ ok: false });
      }
    }
  };
}
