export type NotisThemeMode = 'light' | 'dark';

export function getNotisThemeMode(): NotisThemeMode {
  const explicitTheme = document.documentElement.getAttribute('data-notis-theme');
  if (explicitTheme === 'dark' || explicitTheme === 'light') {
    return explicitTheme;
  }
  if (typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
