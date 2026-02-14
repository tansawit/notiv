import { STORAGE_KEYS } from '../shared/constants';
import type { SubmissionHistoryItem } from '../shared/types';

const MAX_HISTORY_ITEMS = 25;

export async function addToSubmissionHistory(item: SubmissionHistoryItem): Promise<void> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.submissionHistory]);
  const history = (result[STORAGE_KEYS.submissionHistory] as SubmissionHistoryItem[] | undefined) ?? [];

  const existingIndex = history.findIndex((h) => h.id === item.id);
  if (existingIndex !== -1) {
    history.splice(existingIndex, 1);
  }

  history.unshift(item);

  if (history.length > MAX_HISTORY_ITEMS) {
    history.length = MAX_HISTORY_ITEMS;
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.submissionHistory]: history });
}

export async function getSubmissionHistory(): Promise<SubmissionHistoryItem[]> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.submissionHistory]);
  return (result[STORAGE_KEYS.submissionHistory] as SubmissionHistoryItem[] | undefined) ?? [];
}
