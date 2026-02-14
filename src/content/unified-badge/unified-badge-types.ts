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
  onClear: () => void;
  onDelete: (id: string) => void;
  onHover: (id: string | null) => void;
  onEdit: (id: string) => void;
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
export const SUCCESS_WIDTH = 200;
export const ERROR_WIDTH = 220;
export const HEADER_HEIGHT = 48;
export const SETTINGS_HEIGHT = 36;
export const ROW_HEIGHT = 52;

export const TIMING = {
  expand: 250,
  collapse: 200,
  successExpand: 300,
  pillVisible: 2200,
  contentStagger: 20,
  contentDuration: 120,
};

export const EASING = {
  precise: 'cubic-bezier(0.32, 0.72, 0, 1)',
  successSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};
