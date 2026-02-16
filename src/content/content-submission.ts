import type { BackgroundResponse } from '../shared/messages';
import type { LinearTeam } from '../shared/types';
import { STORAGE_KEYS } from '../shared/constants';
import { getLocalStorageItems } from '../shared/chrome-storage';
import type { SubmissionSettings } from './unified-badge';
import type { DraftAnnotation, SettingsState } from './content-session-state';
import { toSubmissionAnnotation } from './content-session-state';

interface UnifiedBadgeSubmissionApi {
  setSubmitting: (value: boolean) => void;
  resetPriority: () => void;
  showSuccessPill: (issue?: { identifier?: string; url?: string; noteCount?: number }) => void;
  showErrorPill: (message: string) => void;
  hideSubmitting: () => void;
}

interface SubmitDraftsOptions {
  draftAnnotations: DraftAnnotation[];
  settingsState: SettingsState;
  unifiedBadge: UnifiedBadgeSubmissionApi;
  getSubmissionSettings: () => SubmissionSettings;
  setDrafts: (nextDrafts: DraftAnnotation[]) => void;
  sendRuntimeMessage: <T = BackgroundResponse>(
    message: {
      type: 'captureAndCreateGroupedIssue';
      payload: {
        annotations: Array<Omit<import('../shared/types').Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'>>;
        overrides: {
          teamId: string;
          triageStateId?: string;
          priority?: number;
          labelIds?: string[];
          assigneeId?: string;
        };
      };
    }
  ) => Promise<T>;
  showToast: (
    message: string,
    link?: { href: string; label: string },
    variant?: 'success' | 'error'
  ) => void;
  showTicketCreatedToast: (issue: { identifier?: string; url?: string }) => void;
}

interface CopyScreenshotOptions {
  draftAnnotations: DraftAnnotation[];
  unifiedBadge: UnifiedBadgeSubmissionApi;
  sendRuntimeMessage: <T = BackgroundResponse>(
    message: {
      type: 'captureAndCopyScreenshot';
      payload: {
        annotations: Array<Omit<import('../shared/types').Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'>>;
      };
    }
  ) => Promise<T>;
  showToast: (
    message: string,
    link?: { href: string; label: string },
    variant?: 'success' | 'error'
  ) => void;
}

async function loadStoredTeamId(): Promise<string | undefined> {
  try {
    const items = await getLocalStorageItems<Record<string, unknown>>([STORAGE_KEYS.submitTeamId]);
    return items?.[STORAGE_KEYS.submitTeamId] as string | undefined;
  } catch {
    return undefined;
  }
}

function resolveSelectedTeam(teams: LinearTeam[], storedTeamId: string | undefined): LinearTeam | undefined {
  return teams.find((team) => team.id === storedTeamId) ?? teams[0];
}

export async function submitDrafts(options: SubmitDraftsOptions): Promise<void> {
  const {
    draftAnnotations,
    settingsState,
    unifiedBadge,
    getSubmissionSettings,
    setDrafts,
    sendRuntimeMessage,
    showToast,
    showTicketCreatedToast
  } = options;

  if (draftAnnotations.length === 0) {
    showToast('No notes to submit yet.', undefined, 'error');
    return;
  }

  const noteCount = draftAnnotations.length;
  unifiedBadge.setSubmitting(true);

  try {
    const storedTeamId = await loadStoredTeamId();
    const selectedTeam = resolveSelectedTeam(settingsState.resources.teams, storedTeamId);

    if (!selectedTeam) {
      throw new Error('No Linear team found for this workspace.');
    }

    const submissionSettings = getSubmissionSettings();
    const response = await sendRuntimeMessage<BackgroundResponse>({
      type: 'captureAndCreateGroupedIssue',
      payload: {
        annotations: draftAnnotations.map((note) => toSubmissionAnnotation(note)),
        overrides: {
          teamId: selectedTeam.id,
          triageStateId: selectedTeam.triageStateId,
          priority: submissionSettings.priority ?? undefined,
          labelIds: submissionSettings.labelIds.length > 0 ? submissionSettings.labelIds : undefined,
          assigneeId: submissionSettings.assigneeId ?? undefined
        }
      }
    });

    if (!response.ok) {
      throw new Error(response.error);
    }

    const issue = (response.data as { identifier?: string; url?: string } | undefined) ?? {};

    setDrafts([]);
    unifiedBadge.resetPriority();
    unifiedBadge.showSuccessPill({ ...issue, noteCount });
    showTicketCreatedToast(issue);
  } catch (error) {
    unifiedBadge.showErrorPill(error instanceof Error ? error.message : 'Unexpected error');
  } finally {
    unifiedBadge.hideSubmitting();
  }
}

export async function copyScreenshot(options: CopyScreenshotOptions): Promise<void> {
  const { draftAnnotations, unifiedBadge, sendRuntimeMessage, showToast } = options;

  if (draftAnnotations.length === 0) {
    showToast('No notes to capture yet.', undefined, 'error');
    return;
  }

  unifiedBadge.setSubmitting(true);
  try {
    const response = await sendRuntimeMessage<BackgroundResponse>({
      type: 'captureAndCopyScreenshot',
      payload: {
        annotations: draftAnnotations.map((note) => toSubmissionAnnotation(note))
      }
    });

    if (!response.ok) {
      throw new Error(response.error);
    }

    showToast('Screenshot copied to clipboard');
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to copy screenshot', undefined, 'error');
  } finally {
    unifiedBadge.hideSubmitting();
  }
}
