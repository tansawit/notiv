import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../../shared/constants';
import type { SubmissionHistoryItem } from '../../shared/types';

interface UseSubmissionHistoryResult {
  history: SubmissionHistoryItem[];
  loading: boolean;
}

export function useSubmissionHistory(): UseSubmissionHistoryResult {
  const [history, setHistory] = useState<SubmissionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.submissionHistory], (result) => {
      const items = (result[STORAGE_KEYS.submissionHistory] as SubmissionHistoryItem[] | undefined) ?? [];
      setHistory(items);
      setLoading(false);
    });

    const handleChange = (changes: { [key: string]: chrome.storage.StorageChange }): void => {
      if (changes[STORAGE_KEYS.submissionHistory]) {
        const items = (changes[STORAGE_KEYS.submissionHistory].newValue as SubmissionHistoryItem[] | undefined) ?? [];
        setHistory(items);
      }
    };

    chrome.storage.local.onChanged.addListener(handleChange);
    return () => {
      chrome.storage.local.onChanged.removeListener(handleChange);
    };
  }, []);

  return { history, loading };
}
