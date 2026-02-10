export type NotivThemeMode = 'light' | 'dark';

export function getNotivThemeMode(): NotivThemeMode {
  const explicitTheme = document.documentElement.getAttribute('data-notiv-theme');
  if (explicitTheme === 'dark' || explicitTheme === 'light') {
    return explicitTheme;
  }
  if (typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
