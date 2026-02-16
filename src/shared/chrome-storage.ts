import { fromChromeCallback, fromChromeCallbackVoid } from './chrome-callback';

type StorageAreaName = 'local' | 'session';

function getStorageArea(area: StorageAreaName): chrome.storage.StorageArea {
  return area === 'local' ? chrome.storage.local : chrome.storage.session;
}

function getStorageItems<T>(area: StorageAreaName, keys: string[]): Promise<T> {
  return fromChromeCallback<Record<string, unknown>>((callback) => {
    getStorageArea(area).get(keys, callback);
  }).then((items) => items as T);
}

function setStorageItems(area: StorageAreaName, items: Record<string, unknown>): Promise<void> {
  return fromChromeCallbackVoid((callback) => {
    getStorageArea(area).set(items, callback);
  });
}

function removeStorageItems(area: StorageAreaName, keys: string[]): Promise<void> {
  return fromChromeCallbackVoid((callback) => {
    getStorageArea(area).remove(keys, callback);
  });
}

export function getLocalStorageItems<T>(keys: string[]): Promise<T> {
  return getStorageItems<T>('local', keys);
}

export function setLocalStorageItems(items: Record<string, unknown>): Promise<void> {
  return setStorageItems('local', items);
}

export function removeLocalStorageItems(keys: string[]): Promise<void> {
  return removeStorageItems('local', keys);
}

export function getSessionStorageItems<T>(key: string): Promise<T | undefined> {
  return getStorageItems<Record<string, unknown>>('session', [key]).then((items) => items[key] as T | undefined);
}

export function setSessionStorageItems(key: string, value: unknown): Promise<void> {
  return setStorageItems('session', { [key]: value });
}

export function removeSessionStorageItems(key: string): Promise<void> {
  return removeStorageItems('session', [key]);
}
