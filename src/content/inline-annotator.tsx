import React, { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import styles from './styles.css?inline';
import type { AnnotationAttachment, ElementSelection, HighlightColor, LinearTeam } from '../shared/types';
import { UI_IDS, STORAGE_KEYS } from '../shared/constants';
import {
  DEFAULT_HIGHLIGHT_COLOR,
  HIGHLIGHT_COLOR_PRESETS
} from '../shared/highlight-colors';
import { getNotivThemeMode } from './theme-mode';
import { loadLastHighlightColor, saveLastHighlightColor } from './color-persistence';
import { getLocalStorageItems, setLocalStorageItems } from '../shared/chrome-storage';

export interface InlineAnnotatorDraft {
  comment: string;
  attachments: AnnotationAttachment[];
  highlightColor: HighlightColor;
}

interface InlineAnnotatorPanelProps {
  initialColor: HighlightColor;
  initialComment?: string;
  initialAttachments?: AnnotationAttachment[];
  isEditing: boolean;
  teams: LinearTeam[];
  selectedTeamId: string | null;
  onTeamChange: (teamId: string) => void;
  onSubmit: (draft: InlineAnnotatorDraft, immediate: boolean) => void;
  onCancel: () => void;
  onDelete?: () => void;
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
    return { name: file.name, dataUrl: sourceDataUrl };
  }

  context.drawImage(image, 0, 0, width, height);
  const compressed = canvas.toDataURL('image/jpeg', 0.86);
  return { name: file.name, dataUrl: compressed };
}

function Icon({ path, size = 16 }: { path: string; size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function InlineAnnotatorPanel({
  initialColor,
  initialComment,
  initialAttachments,
  isEditing,
  teams,
  selectedTeamId,
  onTeamChange,
  onSubmit,
  onCancel,
  onDelete
}: InlineAnnotatorPanelProps): React.JSX.Element {
  const [comment, setComment] = useState(initialComment ?? '');
  const [attachments, setAttachments] = useState<AnnotationAttachment[]>(initialAttachments ?? []);
  const [highlightColor, setHighlightColor] = useState<HighlightColor>(initialColor);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const teamPickerRef = useRef<HTMLDivElement | null>(null);
  const teamSearchRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = comment.trim().length > 0;
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? teams[0];

  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
  const filteredTeams = sortedTeams.filter((team) =>
    team.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
    team.key.toLowerCase().includes(teamSearch.toLowerCase())
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!teamDropdownOpen) {
      setTeamSearch('');
      return;
    }
    const timer = setTimeout(() => teamSearchRef.current?.focus(), 0);
    const handleClickOutside = (e: MouseEvent): void => {
      if (teamPickerRef.current && !teamPickerRef.current.contains(e.target as Node)) {
        setTeamDropdownOpen(false);
      }
    };
    const frameId = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside);
    });
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [teamDropdownOpen]);

  const handleSubmit = (immediate: boolean): void => {
    if (!canSubmit) return;
    void saveLastHighlightColor(highlightColor);
    onSubmit({ comment: comment.trim(), attachments, highlightColor }, immediate);
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLInputElement>): Promise<void> => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length === 0) return;
    event.preventDefault();

    const availableSlots = Math.max(0, 3 - attachments.length);
    const filesToProcess = imageFiles.slice(0, availableSlots);
    if (filesToProcess.length === 0) return;

    try {
      const newAttachments = await Promise.all(filesToProcess.map(prepareAttachment));
      setAttachments((prev) => [...prev, ...newAttachments].slice(0, 3));
    } catch {
      // Silently fail attachment paste
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const list = event.target.files;
    if (!list || list.length === 0) return;

    const availableSlots = Math.max(0, 3 - attachments.length);
    const files = Array.from(list).filter((f) => f.type.startsWith('image/')).slice(0, availableSlots);
    if (files.length === 0) return;

    try {
      const newAttachments = await Promise.all(files.map(prepareAttachment));
      setAttachments((prev) => [...prev, ...newAttachments].slice(0, 3));
    } catch {
      // Silently fail
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div
      className="notiv-inline-annotator"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="notiv-inline-main-row">
        {isEditing && onDelete && (
          <button
            type="button"
            className="notiv-inline-delete-btn"
            onClick={onDelete}
            title="Delete note"
            aria-label="Delete note"
          >
            <Icon path="M3 6h18M8 6V4h8v2M5 6v14a1 1 0 001 1h12a1 1 0 001-1V6M10 11v6M14 11v6" size={16} />
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          className="notiv-inline-input"
          placeholder="Add a note..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onPaste={(e) => { void handlePaste(e); }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              const immediate = e.metaKey || e.ctrlKey;
              handleSubmit(immediate);
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }
          }}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { void handleFileChange(e); }}
        />

        {attachments.length > 0 && (
          <span className="notiv-inline-attachment-count" title={`${attachments.length} image(s) attached`}>
            {attachments.length}
          </span>
        )}

        <button
          type="button"
          className="notiv-inline-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={attachments.length >= 3}
          title={attachments.length >= 3 ? '3 images max' : 'Attach image (or paste)'}
          aria-label="Attach image"
        >
          <Icon path="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" size={16} />
        </button>

        <button
          type="button"
          className="notiv-inline-submit-btn"
          onClick={() => handleSubmit(false)}
          disabled={!canSubmit}
          title="Save note (Enter)"
          aria-label="Save note"
        >
          <Icon path="M5 12h11M12 5l7 7-7 7" size={16} />
        </button>
      </div>

      <div className="notiv-inline-footer">
        <div className="notiv-inline-picker-row">
          {HIGHLIGHT_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`notiv-inline-picker-dot${preset.id === highlightColor ? ' active' : ''}`}
              style={{ background: preset.pinFill }}
              onClick={() => setHighlightColor(preset.id)}
              title={preset.label}
              aria-label={preset.label}
            >
              <svg className="notiv-inline-picker-check" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>

        {selectedTeam && (
          <div className="notiv-inline-team-picker" ref={teamPickerRef}>
            <button
              type="button"
              className={`notiv-inline-team-btn${teamDropdownOpen ? ' active' : ''}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
              title={`Submitting to ${selectedTeam.name}`}
            >
              <span className="notiv-inline-team-arrow">→</span>
              <span className="notiv-inline-team-key">{selectedTeam.key}</span>
              <svg className="notiv-inline-team-chevron" width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {teamDropdownOpen && (
              <div className="notiv-inline-team-dropdown">
                {teams.length > 5 && (
                  <div className="notiv-inline-team-dropdown-search">
                    <svg className="notiv-inline-team-dropdown-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <input
                      ref={teamSearchRef}
                      type="text"
                      className="notiv-inline-team-dropdown-search-input"
                      placeholder="Search teams..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setTeamDropdownOpen(false);
                        }
                      }}
                    />
                  </div>
                )}
                <div className="notiv-inline-team-dropdown-list">
                  {filteredTeams.length === 0 ? (
                    <div className="notiv-inline-team-dropdown-empty">No teams found</div>
                  ) : (
                    filteredTeams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        className={`notiv-inline-team-dropdown-item${team.id === selectedTeam.id ? ' selected' : ''}`}
                        onClick={() => {
                          onTeamChange(team.id);
                          setTeamDropdownOpen(false);
                        }}
                      >
                        <span className="notiv-inline-team-dropdown-prefix">{team.key}</span>
                        <span className="notiv-inline-team-dropdown-name">{team.name}</span>
                        {team.id === selectedTeam.id && (
                          <svg className="notiv-inline-team-dropdown-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>
                              </div>
            )}
          </div>
        )}

        <div className="notiv-inline-hint">
          <span className="notiv-inline-hint-key">↵</span>
          <span className="notiv-inline-hint-label">Save</span>
          <span className="notiv-inline-hint-sep">·</span>
          <span className="notiv-inline-hint-key">⌘</span>
          <span className="notiv-inline-hint-key">↵</span>
          <span className="notiv-inline-hint-label">Submit</span>
        </div>
      </div>
    </div>
  );
}

export interface InlineAnnotatorOpenOptions {
  initialDraft?: {
    comment: string;
    attachments: AnnotationAttachment[];
    highlightColor: HighlightColor;
  };
  anchorPoint: { x: number; y: number };
  onDelete?: () => void;
}

export class InlineAnnotator {
  private container: HTMLDivElement | null = null;
  private reactRoot: Root | null = null;
  private currentSelection: ElementSelection | null = null;
  private openOptions: InlineAnnotatorOpenOptions | null = null;
  private lastColor: HighlightColor = DEFAULT_HIGHLIGHT_COLOR;
  private teams: LinearTeam[] = [];
  private selectedTeamId: string | null = null;
  private formKey = 0;
  private readonly systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly themeChangeHandler = (): void => {
    this.applyThemeMode();
  };
  private readonly outsidePointerHandler = (event: PointerEvent): void => {
    if (!this.currentSelection || !this.container) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (this.container.contains(target)) return;
    if (target instanceof Element && target.closest('[data-notiv-ui="true"]')) return;
    event.preventDefault();
    event.stopPropagation();
    this.shake();
  };

  constructor(
    private readonly onSubmit: (
      selection: ElementSelection,
      draft: InlineAnnotatorDraft,
      immediate: boolean
    ) => void,
    private readonly onCancel: () => void
  ) {
    void loadLastHighlightColor().then((color) => {
      this.lastColor = color;
    });
    void this.loadSelectedTeamId();
  }

  setTeams(teams: LinearTeam[]): void {
    this.teams = teams;
    this.render();
  }

  private async loadSelectedTeamId(): Promise<void> {
    try {
      const items = await getLocalStorageItems<Record<string, unknown>>([STORAGE_KEYS.submitTeamId]);
      const stored = items?.[STORAGE_KEYS.submitTeamId];
      if (typeof stored === 'string' && stored) {
        this.selectedTeamId = stored;
      }
    } catch {
      // Ignore
    }
  }

  private async saveSelectedTeamId(teamId: string): Promise<void> {
    this.selectedTeamId = teamId;
    try {
      await setLocalStorageItems({ [STORAGE_KEYS.submitTeamId]: teamId });
    } catch {
      // Ignore
    }
    this.render();
  }

  async open(selection: ElementSelection, options: InlineAnnotatorOpenOptions): Promise<void> {
    this.ensureMounted();
    this.currentSelection = selection;
    this.openOptions = options;
    this.formKey += 1;

    if (!options.initialDraft) {
      this.lastColor = await loadLastHighlightColor();
    }

    this.render();
    this.position(options.anchorPoint);
    window.setTimeout(() => this.focusInput(), 0);
  }

  close(): void {
    this.currentSelection = null;
    this.openOptions = null;
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
    this.reactRoot = null;
    this.currentSelection = null;
  }

  private ensureMounted(): void {
    if (this.container) return;

    const container = document.createElement('div');
    container.id = `${UI_IDS.rootContainer}-inline`;
    container.setAttribute('data-notiv-ui', 'true');
    container.style.position = 'fixed';
    container.style.zIndex = '2147483647';
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
    this.reactRoot = createRoot(rootTarget);
  }

  private applyThemeMode(): void {
    if (!this.container) return;
    this.container.setAttribute('data-notiv-theme', getNotivThemeMode());
  }

  private position(anchorPoint: { x: number; y: number }): void {
    if (!this.container) return;

    const margin = 16;
    const panelWidth = 380;
    const panelHeight = 80;
    const horizontalOffset = 14;

    const preferRightX = anchorPoint.x + horizontalOffset;
    const preferLeftX = anchorPoint.x - panelWidth - horizontalOffset;
    const maxX = window.innerWidth - panelWidth - margin;
    const minX = margin;

    let safeX = preferRightX;
    if (preferRightX > maxX && preferLeftX >= minX) {
      safeX = preferLeftX;
    }
    safeX = Math.max(minX, Math.min(safeX, maxX));

    const verticalOffset = -12;
    const desiredY = anchorPoint.y + verticalOffset;
    const maxY = window.innerHeight - panelHeight - margin;
    const safeY = Math.max(margin, Math.min(desiredY, maxY));

    this.container.style.left = `${safeX}px`;
    this.container.style.top = `${safeY}px`;
  }

  private render(): void {
    if (!this.reactRoot || !this.currentSelection || !this.openOptions) {
      this.reactRoot?.render(<></>);
      return;
    }

    const selection = this.currentSelection;
    const options = this.openOptions;
    const isEditing = !!options.initialDraft;

    this.reactRoot.render(
      <InlineAnnotatorPanel
        key={this.formKey}
        initialColor={options.initialDraft?.highlightColor ?? this.lastColor}
        initialComment={options.initialDraft?.comment}
        initialAttachments={options.initialDraft?.attachments}
        isEditing={isEditing}
        teams={this.teams}
        selectedTeamId={this.selectedTeamId}
        onTeamChange={(teamId) => {
          void this.saveSelectedTeamId(teamId);
        }}
        onSubmit={(draft, immediate) => {
          this.lastColor = draft.highlightColor;
          this.onSubmit(selection, draft, immediate);
        }}
        onCancel={this.onCancel}
        onDelete={options.onDelete}
      />
    );
  }

  private focusInput(): void {
    const input = this.container?.shadowRoot?.querySelector('input[type="text"]') as HTMLInputElement | null;
    input?.focus();
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
    this.focusInput();
  }
}
