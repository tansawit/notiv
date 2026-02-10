type StorageAreaName = 'local' | 'session';

function getStorageArea(area: StorageAreaName): chrome.storage.StorageArea {
  return area === 'local' ? chrome.storage.local : chrome.storage.session;
}

function getStorageItems<T>(area: StorageAreaName, keys: string[]): Promise<T> {
  return new Promise((resolve, reject) => {
    getStorageArea(area).get(keys, (items) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(items as T);
    });
  });
}

function setStorageItems(area: StorageAreaName, items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    getStorageArea(area).set(items, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

function removeStorageItems(area: StorageAreaName, keys: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    getStorageArea(area).remove(keys, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
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
