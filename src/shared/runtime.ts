import type { BackgroundResponse, ContentToBackgroundMessage } from './messages';
import { fromChromeCallback } from './chrome-callback';

export function sendRuntimeMessage<T = BackgroundResponse>(message: ContentToBackgroundMessage): Promise<T> {
  return fromChromeCallback<T>((callback) => {
    chrome.runtime.sendMessage(message, callback);
  });
}
