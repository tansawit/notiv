import { fromChromeCallback } from './chrome-callback';

export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  return fromChromeCallback<chrome.tabs.Tab[]>((callback) => {
    chrome.tabs.query({ active: true, currentWindow: true }, callback);
  }).then((tabs) => tabs[0] ?? null);
}

export function containsOriginPermission(origin: string): Promise<boolean> {
  return fromChromeCallback<boolean>((callback) => {
    chrome.permissions.contains({ origins: [origin] }, callback);
  }).then((granted) => Boolean(granted));
}

export function requestOriginPermission(origin: string): Promise<boolean> {
  return fromChromeCallback<boolean>((callback) => {
    chrome.permissions.request({ origins: [origin] }, callback);
  }).then((granted) => Boolean(granted));
}

export function removeOriginPermission(origin: string): Promise<boolean> {
  return fromChromeCallback<boolean>((callback) => {
    chrome.permissions.remove({ origins: [origin] }, callback);
  }).then((removed) => Boolean(removed));
}

export function getAllPermissions(): Promise<chrome.permissions.Permissions> {
  return fromChromeCallback<chrome.permissions.Permissions>((callback) => {
    chrome.permissions.getAll(callback);
  });
}
