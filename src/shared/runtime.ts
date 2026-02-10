import type { BackgroundResponse, ContentToBackgroundMessage } from './messages';

export function sendRuntimeMessage<T = BackgroundResponse>(message: ContentToBackgroundMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });
}
