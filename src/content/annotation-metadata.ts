export function getComputedStylesSnapshot(element: Element): Record<string, string> {
  const styles = window.getComputedStyle(element);
  return {
    display: styles.display,
    position: styles.position,
    color: styles.color,
    backgroundColor: styles.backgroundColor,
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight
  };
}

function extractVersion(ua: string, marker: string): string | null {
  const index = ua.indexOf(marker);
  if (index < 0) {
    return null;
  }
  const version = ua.slice(index + marker.length).split(/[ ;)]/)[0];
  return version || null;
}

export function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) {
    return `Edge ${extractVersion(ua, 'Edg/') ?? ''}`.trim();
  }
  if (ua.includes('OPR/')) {
    return `Opera ${extractVersion(ua, 'OPR/') ?? ''}`.trim();
  }
  if (ua.includes('Firefox/')) {
    return `Firefox ${extractVersion(ua, 'Firefox/') ?? ''}`.trim();
  }
  if (ua.includes('Chrome/')) {
    return `Chrome ${extractVersion(ua, 'Chrome/') ?? ''}`.trim();
  }
  if (ua.includes('Safari/') && ua.includes('Version/')) {
    return `Safari ${extractVersion(ua, 'Version/') ?? ''}`.trim();
  }
  return 'Unknown';
}

export function detectOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows NT 10.0')) {
    return 'Windows 10/11';
  }
  if (ua.includes('Windows NT 6.3')) {
    return 'Windows 8.1';
  }
  if (ua.includes('Windows NT 6.1')) {
    return 'Windows 7';
  }
  const mac = ua.match(/Mac OS X ([0-9_]+)/);
  if (mac?.[1]) {
    return `macOS ${mac[1].replace(/_/g, '.')}`;
  }
  const ios = ua.match(/OS ([0-9_]+) like Mac OS X/);
  if (ios?.[1]) {
    return `iOS ${ios[1].replace(/_/g, '.')}`;
  }
  const android = ua.match(/Android ([0-9.]+)/);
  if (android?.[1]) {
    return `Android ${android[1]}`;
  }
  if (ua.includes('Linux')) {
    return 'Linux';
  }
  return 'Unknown';
}

export function sanitizeCapturedUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return parsed.origin;
  } catch {
    return rawUrl;
  }
}

export function isElementFixedOrSticky(element: Element | null): boolean {
  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    if (current instanceof HTMLElement) {
      const position = window.getComputedStyle(current).position;
      if (position === 'fixed' || position === 'sticky') {
        return true;
      }
    }
    current = current.parentElement;
  }
  return false;
}
