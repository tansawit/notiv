import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import styles from './styles.css?inline';
import type { AnnotationAttachment, ElementSelection, HighlightColor } from '../shared/types';
import { UI_IDS } from '../shared/constants';
import { resolveSelectionLabel } from './selection-label';
import { getNotivThemeMode } from './theme-mode';
import {
  DEFAULT_HIGHLIGHT_COLOR,
  HIGHLIGHT_COLOR_PRESETS,
  resolveHighlightColor
} from '../shared/highlight-colors';

export interface AnnotationDraft {
  comment: string;
  attachments: AnnotationAttachment[];
  highlightColor: HighlightColor;
}

interface AnnotatorProps {
  selection: ElementSelection;
  busy: boolean;
  error?: string;
  initialDraft?: AnnotationDraft;
  submitLabel?: string;
  onDelete?: () => void;
  onSubmit: (draft: AnnotationDraft) => void;
  onCancel: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode image file.'));
    image.src = dataUrl;
  });
}

async function prepareAttachment(file: File): Promise<AnnotationAttachment> {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);

  const maxEdge = 1440;
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    return {
      name: file.name,
      dataUrl: sourceDataUrl
    };
  }

  context.drawImage(image, 0, 0, width, height);
  const compressed = canvas.toDataURL('image/jpeg', 0.86);

  return {
    name: file.name,
    dataUrl: compressed
  };
}

function Icon({
  path,
  filled = false,
  size = 16
}: {
  path: string;
  filled?: boolean;
  size?: number;
}): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={filled ? 2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

function AnnotationPanel({
  selection,
  busy,
  error,
  initialDraft,
  submitLabel,
  onDelete,
  onSubmit,
  onCancel
}: AnnotatorProps): JSX.Element {
  const [comment, setComment] = useState(initialDraft?.comment ?? '');
  const [attachments, setAttachments] = useState<AnnotationAttachment[]>(initialDraft?.attachments ?? []);
  const [highlightColor, setHighlightColor] = useState<HighlightColor>(
    resolveHighlightColor(initialDraft?.highlightColor ?? DEFAULT_HIGHLIGHT_COLOR)
  );
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const targetLabel = useMemo(() => resolveSelectionLabel(selection), [selection]);

  const canSubmit = comment.trim().length > 0 && !busy;
  const attachmentLimitReached = attachments.length >= 3;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const handleAddImages = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const list = event.target.files;
    if (!list || list.length === 0) {
      return;
    }

    setAttachmentBusy(true);
    setAttachmentError(undefined);

    try {
      const availableSlots = Math.max(0, 3 - attachments.length);
      const files = Array.from(list).filter((file) => file.type.startsWith('image/')).slice(0, availableSlots);
      if (files.length === 0) {
        setAttachmentError('Only image files are supported.');
        return;
      }

      const next = await Promise.all(files.map((file) => prepareAttachment(file)));
      setAttachments((current) => [...current, ...next].slice(0, 3));
    } catch (imageError) {
      setAttachmentError(imageError instanceof Error ? imageError.message : 'Could not attach image.');
    } finally {
      setAttachmentBusy(false);
      event.target.value = '';
    }
  };

  return (
    <form
      className="notiv-panel"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ comment: comment.trim(), attachments, highlightColor });
      }}
    >
      <div className="notiv-header">
        <div className="notiv-header-left">
          <span className="notiv-target-chip" title={targetLabel}>
            {targetLabel}
          </span>
        </div>
        <div className="notiv-header-actions">
          {onDelete ? (
            <button
              className="notiv-icon-button notiv-icon-button-danger"
              type="button"
              title="Delete note"
              aria-label="Delete note"
              disabled={busy}
              onClick={onDelete}
            >
              <Icon path="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" />
            </button>
          ) : null}
          <button
            className="notiv-icon-button notiv-icon-button-ghost"
            type="button"
            title="Cancel"
            aria-label="Cancel"
            disabled={busy}
            onClick={onCancel}
          >
            <Icon path="M6 6l12 12M18 6L6 18" />
          </button>
        </div>
      </div>

      <div className="notiv-body">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            void handleAddImages(event);
          }}
        />
        <textarea
          ref={textareaRef}
          className="notiv-textarea"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) {
              return;
            }
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (canSubmit) {
                onSubmit({ comment: comment.trim(), attachments, highlightColor });
              }
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }
          }}
          required
          placeholder="What needs attention?"
          autoFocus
          rows={2}
        />

        <div className="notiv-controls-row">
          <div className="notiv-color-section">
            <RadioGroup
              className="notiv-color-grid"
              aria-label="Highlight color"
              value={highlightColor}
              disabled={busy}
              onValueChange={(nextValue) => {
                setHighlightColor(resolveHighlightColor(String(nextValue)));
              }}
            >
              {HIGHLIGHT_COLOR_PRESETS.map((preset) => {
                const active = preset.id === highlightColor;
                return (
                  <Radio.Root
                    key={preset.id}
                    value={preset.id}
                    className={`notiv-color-chip${active ? ' notiv-color-chip-active' : ''}`}
                    title={preset.label}
                    aria-label={`${preset.label} highlight`}
                    style={{
                      borderColor: 'transparent',
                      background: 'transparent',
                      boxShadow: 'none',
                      opacity: busy ? 0.55 : 1,
                      cursor: busy ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <span
                      className="notiv-color-dot"
                      style={{
                        background: preset.pinFill
                      }}
                      aria-hidden="true"
                    />
                  </Radio.Root>
                );
              })}
            </RadioGroup>
          </div>
          <div className="notiv-inline-actions">
            <button
              className="notiv-icon-button notiv-icon-button-ghost"
              type="button"
              title={attachmentLimitReached ? '3 images max' : 'Attach image'}
              aria-label={attachmentLimitReached ? '3 images max' : 'Attach image'}
              disabled={busy || attachmentBusy || attachmentLimitReached}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon path="M8 12.5l7-7a3 3 0 1 1 4.2 4.3l-8.8 8.8a5 5 0 1 1-7.1-7.1l8.5-8.5" />
            </button>
            <button
              className="notiv-icon-button notiv-icon-button-primary"
              type="submit"
              title={busy ? 'Saving...' : submitLabel ?? 'Save note'}
              aria-label={busy ? 'Saving...' : submitLabel ?? 'Save note'}
              disabled={!canSubmit}
            >
              <Icon path="M5 12h11M12 5l7 7-7 7" />
            </button>
          </div>
        </div>

        {attachments.length > 0 ? (
          <div className="notiv-attachments-grid">
            {attachments.map((attachment, index) => (
              <div className="notiv-attachment-card" key={`${attachment.name}-${index}`}>
                <img className="notiv-attachment-thumb" src={attachment.dataUrl} alt={attachment.name} />
                <button
                  className="notiv-attachment-remove"
                  type="button"
                  onClick={() => {
                    setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index));
                  }}
                  aria-label={`Remove ${attachment.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="notiv-footer-note">
          <span>{attachmentBusy ? 'Attaching...' : `${attachments.length}/3 images`}</span>
          <span>Enter to save · Shift+Enter newline</span>
        </div>

        {attachmentError ? <div className="notiv-error">{attachmentError}</div> : null}
        {error ? <div className="notiv-error">{error}</div> : null}
      </div>
    </form>
  );
}

interface OpenOptions {
  initialDraft?: AnnotationDraft;
  title?: string;
  submitLabel?: string;
  onDelete?: () => void;
  anchorPoint?: { x: number; y: number };
}

export class Annotator {
  private container: HTMLDivElement | null = null;
  private shadowHost: HTMLDivElement | null = null;
  private reactRoot: Root | null = null;
  private currentSelection: ElementSelection | null = null;
  private busy = false;
  private error: string | undefined;
  private openOptions: OpenOptions = {};
  private formKey = 0;
  private readonly systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly themeChangeHandler = (): void => {
    this.applyThemeMode();
  };
  private readonly outsidePointerHandler = (event: PointerEvent): void => {
    if (!this.currentSelection || !this.container) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (this.container.contains(target)) {
      return;
    }
    if (target instanceof Element && target.closest('[data-notiv-ui="true"]')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.shake();
  };

  constructor(
    private readonly onSubmit: (selection: ElementSelection, draft: AnnotationDraft) => void,
    private readonly onCancel: () => void
  ) {}

  open(selection: ElementSelection, options?: OpenOptions): void {
    this.ensureMounted();
    this.currentSelection = selection;
    this.busy = false;
    this.error = undefined;
    this.openOptions = options ?? {};
    this.formKey += 1;
    this.render();
    this.position(selection, this.openOptions.anchorPoint);
    window.setTimeout(() => this.focusTextarea(), 0);
  }

  close(): void {
    this.currentSelection = null;
    this.busy = false;
    this.error = undefined;
    this.openOptions = {};
    this.render();
  }

  setBusy(value: boolean): void {
    this.busy = value;
    this.render();
  }

  setError(message?: string): void {
    this.error = message;
    this.render();
  }

  isOpen(): boolean {
    return !!this.currentSelection;
  }

  destroy(): void {
    document.removeEventListener('pointerdown', this.outsidePointerHandler, true);
    this.systemThemeQuery.removeEventListener('change', this.themeChangeHandler);
    window.removeEventListener('notiv-theme-change', this.themeChangeHandler as EventListener);
    this.reactRoot?.unmount();
    this.container?.remove();
    this.container = null;
    this.shadowHost = null;
    this.reactRoot = null;
    this.currentSelection = null;
  }

  private ensureMounted(): void {
    if (this.container) {
      return;
    }

    const container = document.createElement('div');
    container.id = UI_IDS.rootContainer;
    container.setAttribute('data-notiv-ui', 'true');
    container.style.position = 'fixed';
    container.style.zIndex = '2147483647';
    container.style.right = '16px';
    container.style.top = '16px';
    container.setAttribute('data-notiv-theme', getNotivThemeMode());

    const shadow = container.attachShadow({ mode: 'open' });
    const styleTag = document.createElement('style');
    styleTag.id = UI_IDS.styleTag;
    styleTag.textContent = styles;
    shadow.appendChild(styleTag);

    const rootTarget = document.createElement('div');
    shadow.appendChild(rootTarget);

    document.documentElement.appendChild(container);
    document.addEventListener('pointerdown', this.outsidePointerHandler, true);
    this.systemThemeQuery.addEventListener('change', this.themeChangeHandler);
    window.addEventListener('notiv-theme-change', this.themeChangeHandler as EventListener);

    this.container = container;
    this.shadowHost = rootTarget;
    this.reactRoot = createRoot(rootTarget);
  }

  private applyThemeMode(): void {
    if (!this.container) {
      return;
    }
    this.container.setAttribute('data-notiv-theme', getNotivThemeMode());
  }

  private position(selection: ElementSelection, anchorPoint?: { x: number; y: number }): void {
    if (!this.container) {
      return;
    }

    const margin = 16;
    const panelRect = this.container.getBoundingClientRect();
    const panelWidth = Math.max(320, Math.round(panelRect.width) || 380);
    const panelHeight = Math.max(180, Math.round(panelRect.height) || 220);
    const pointer = anchorPoint ?? {
      x: selection.boundingBox.x + selection.boundingBox.width / 2,
      y: selection.boundingBox.y + selection.boundingBox.height / 2
    };
    const horizontalOffset = 14;
    const verticalOffset = 12;
    const minX = margin;
    const maxX = window.innerWidth - panelWidth - margin;
    const preferRightX = pointer.x + horizontalOffset;
    const preferLeftX = pointer.x - panelWidth - horizontalOffset;

    let safeX = preferRightX;
    if (preferRightX > maxX && preferLeftX >= minX) {
      safeX = preferLeftX;
    }
    safeX = Math.max(minX, Math.min(safeX, maxX));

    const desiredY = pointer.y - verticalOffset;
    const maxY = window.innerHeight - panelHeight - margin;
    const safeY = Math.max(margin, Math.min(desiredY, maxY));

    this.container.style.left = `${safeX}px`;
    this.container.style.top = `${safeY}px`;
    this.container.style.right = 'auto';
  }

  private render(): void {
    if (!this.reactRoot || !this.currentSelection) {
      this.reactRoot?.render(<></>);
      return;
    }

    const selection = this.currentSelection;
    this.reactRoot.render(
      <AnnotationPanel
        key={this.formKey}
        selection={selection}
        busy={this.busy}
        error={this.error}
        initialDraft={this.openOptions.initialDraft}
        submitLabel={this.openOptions.submitLabel}
        onDelete={this.openOptions.onDelete}
        onCancel={this.onCancel}
        onSubmit={(draft) => this.onSubmit(selection, draft)}
      />
    );
  }

  private focusTextarea(): void {
    const textarea = this.shadowHost?.querySelector('textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      return;
    }
    textarea.focus();
    const length = textarea.value.length;
    textarea.setSelectionRange(length, length);
  }

  private shake(): void {
    this.container?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(0)' }
      ],
      { duration: 220, easing: 'ease-out' }
    );
    this.focusTextarea();
  }
}
