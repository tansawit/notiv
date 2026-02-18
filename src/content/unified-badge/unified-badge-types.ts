import type { HighlightColor, LinearLabel, LinearTeam, LinearUser } from '../../shared/types';

export type Stage = 'badge' | 'queue' | 'loading' | 'success' | 'error';

export interface QueueNoteSummary {
  id: string;
  comment: string;
  target: string;
  attachmentsCount?: number;
  highlightColor: HighlightColor;
}

export interface UnifiedBadgeCallbacks {
  onBadgeClick: () => void;
  onSubmit: () => void;
  onCopyScreenshot: () => void;
  onClear: () => void;
  onDelete: (id: string) => void;
  onHover: (id: string | null) => void;
  onEdit: (id: string) => void;
  onOpenSettings: () => void;
}

export interface SubmissionSettings {
  priority: number | null;
  labelIds: string[];
  assigneeId: string | null;
}

export interface NotePosition {
  x: number;
  y: number;
  color: string;
}

export interface UnifiedBadgeResources {
  teams: LinearTeam[];
  labels: LinearLabel[];
  users: LinearUser[];
}

export const BADGE_SIZE = 36;
export const QUEUE_WIDTH = 320;
export const SUCCESS_WIDTH = 240;
export const ERROR_WIDTH = 220;
export const HEADER_HEIGHT = 48;
export const SETTINGS_HEIGHT = 36;
export const ROW_HEIGHT = 52;

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Queue Expand / Collapse
 *
 * EXPAND (badge → queue):
 *    0ms   morph container starts expanding
 *   40ms   header fades in, slides down
 *   60ms   rows begin staggered entrance (25ms apart)
 *   80ms   settings bar fades in, slides up
 *  320ms   morph expansion completes
 *
 * COLLAPSE (queue → badge):
 *    0ms   rows begin staggered exit (slide left, fade)
 *   40ms   settings bar fades out, slides down
 *   80ms   header fades out, slides up
 *  120ms   morph container starts collapsing
 *  280ms   morph collapse completes
 * ───────────────────────────────────────────────────────── */

export const TIMING = {
  expand: 320,
  collapse: 160,
  successExpand: 300,
  pillVisible: 3500,
  collapseDelay: 120,

  enter: {
    header: 40,
    settings: 80,
    rowsStart: 60,
    rowStagger: 25,
    duration: 220,
  },

  exit: {
    rowStagger: 20,
    settings: 40,
    header: 80,
    duration: 120,
  },

  rowAdd: {
    expandDuration: 220,
    enterDuration: 200,
    enterDelay: 60,
  },
};


export const EASING = {
  expandMorph: 'cubic-bezier(0.32, 0.72, 0, 1)',
  collapseMorph: 'cubic-bezier(0.4, 0, 0.2, 1)',
  contentIn: 'cubic-bezier(0.22, 1, 0.36, 1)',
  contentOut: 'cubic-bezier(0.4, 0, 1, 1)',
  successSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};
