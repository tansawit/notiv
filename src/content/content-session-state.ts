import type { QueueNoteSummary } from './unified-badge';
import type { Annotation, LinearWorkspaceResources } from '../shared/types';
import { resolveHighlightColor } from '../shared/highlight-colors';

export type DraftAnnotation = Omit<Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'> & {
  anchorX: number;
  anchorY: number;
  fixed?: boolean;
};

export interface SettingsState {
  loading: boolean;
  loadingResources: boolean;
  accessToken: string;
  resources: LinearWorkspaceResources;
  markersVisible: boolean;
  error?: string;
}

const AUTH_ERROR_PATTERNS = ['401', '403', 'unauthorized', 'not connected'];
const AUTH_TOKEN_ERROR_PAIRS = [['invalid', 'token'], ['expired', 'token']];

export function hasLinearAuthError(error?: string): boolean {
  if (!error) return false;
  const message = error.toLowerCase();
  if (AUTH_ERROR_PATTERNS.some((pattern) => message.includes(pattern))) {
    return true;
  }
  return AUTH_TOKEN_ERROR_PAIRS.some(([left, right]) => message.includes(left) && message.includes(right));
}

export function getNoteCreationBlockedMessage(settingsState: SettingsState): string | null {
  if (settingsState.loading || settingsState.loadingResources) {
    return 'Checking Linear connection. Try creating the note again in a second.';
  }

  if (!settingsState.accessToken.trim()) {
    return 'Connect Linear first. Open extension settings and complete OAuth, then refresh workspace data.';
  }

  if (settingsState.error) {
    if (hasLinearAuthError(settingsState.error)) {
      return 'Linear session is invalid or expired. Reconnect in extension settings, then refresh workspace data.';
    }
    return `Linear connection error: ${settingsState.error}`;
  }

  return null;
}

export function toQueueItems(notes: DraftAnnotation[]): QueueNoteSummary[] {
  return notes.map((note) => {
    const component = note.componentName ?? note.reactComponents?.[0];
    return {
      id: note.id,
      comment: note.comment,
      target: note.elementLabel ?? (component ? component : note.element),
      attachmentsCount: note.attachments?.length ?? 0,
      highlightColor: resolveHighlightColor(note.highlightColor)
    };
  });
}

export function toSubmissionAnnotation(
  note: DraftAnnotation
): Omit<Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { anchorX, anchorY, fixed, ...annotation } = note;
  return annotation;
}
