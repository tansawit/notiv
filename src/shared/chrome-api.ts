export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(tabs[0] ?? null);
    });
  });
}

export function containsOriginPermission(origin: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.contains({ origins: [origin] }, (granted) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(Boolean(granted));
    });
  });
}

export function requestOriginPermission(origin: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.request({ origins: [origin] }, (granted) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(Boolean(granted));
    });
  });
}

export function removeOriginPermission(origin: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.remove({ origins: [origin] }, (removed) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(Boolean(removed));
    });
  });
}

export function getAllPermissions(): Promise<chrome.permissions.Permissions> {
  return new Promise((resolve, reject) => {
    chrome.permissions.getAll((permissions) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(permissions);
    });
  });
}
