export function fromChromeCallback<T>(
  invoke: (callback: (result: T) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    invoke((result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(result);
    });
  });
}

export function fromChromeCallbackVoid(
  invoke: (callback: () => void) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    invoke(() => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}
