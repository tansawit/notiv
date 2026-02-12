import type { HighlightColor } from '../shared/types';
import { STORAGE_KEYS } from '../shared/constants';
import { DEFAULT_HIGHLIGHT_COLOR, resolveHighlightColor } from '../shared/highlight-colors';
import { getLocalStorageItems, setLocalStorageItems } from '../shared/chrome-storage';

export async function loadLastHighlightColor(): Promise<HighlightColor> {
  try {
    const items = await getLocalStorageItems<Record<string, unknown>>([STORAGE_KEYS.lastHighlightColor]);
    const stored = items?.[STORAGE_KEYS.lastHighlightColor];
    return resolveHighlightColor(typeof stored === 'string' ? stored : undefined);
  } catch {
    return DEFAULT_HIGHLIGHT_COLOR;
  }
}

export async function saveLastHighlightColor(color: HighlightColor): Promise<void> {
  try {
    await setLocalStorageItems({ [STORAGE_KEYS.lastHighlightColor]: color });
  } catch {
    // Color preference will use default on next load if storage fails.
  }
}
