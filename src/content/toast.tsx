import { FONT_STACK_SANS, getVisualModeTokens } from '../shared/visual-tokens';

type ToastVariant = 'success' | 'error' | 'loading';
type NotisThemeMode = 'light' | 'dark';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  description?: HTMLElement | string;
}

let toastContainer: HTMLDivElement | null = null;
let toastId = 0;
const activeToasts = new Map<number, HTMLDivElement>();
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const TOAST_DURATION = 5000;

function getTheme(): NotisThemeMode {
  const explicitTheme = document.documentElement.getAttribute('data-notis-theme');
  if (explicitTheme === 'dark' || explicitTheme === 'light') {
    return explicitTheme;
  }
  return systemThemeQuery.matches ? 'dark' : 'light';
}

function ensureContainer(): HTMLDivElement {
  if (toastContainer) {
    return toastContainer;
  }

  toastContainer = document.createElement('div');
  toastContainer.setAttribute('data-notis-ui', 'true');
  Object.assign(toastContainer.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    zIndex: '2147483647',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    pointerEvents: 'none'
  });
  document.documentElement.appendChild(toastContainer);
  return toastContainer;
}

function createIconSvg(variant: ToastVariant, color: string): string {
  if (variant === 'success') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
  }
  if (variant === 'error') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>`;
  }
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"><path d="M12 2a10 10 0 0 1 10 10"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>`;
}

function createToastElement(toast: Toast): HTMLDivElement {
  const theme = getTheme();
  const tokens = getVisualModeTokens(theme);

  const el = document.createElement('div');
  el.setAttribute('data-notis-ui', 'true');
  el.setAttribute('role', 'alert');

  const iconColor = toast.variant === 'success' ? '#22c55e' : toast.variant === 'error' ? '#ef4444' : tokens.toast.color;

  Object.assign(el.style, {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '8px',
    background: tokens.toast.background,
    color: tokens.toast.color,
    border: `1px solid ${tokens.toast.border}`,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontFamily: FONT_STACK_SANS,
    fontSize: '13px',
    lineHeight: '1.4',
    maxWidth: '360px',
    pointerEvents: 'auto',
    opacity: '0',
    transform: 'translateY(8px)',
    transition: 'opacity 150ms ease, transform 150ms ease'
  });

  const iconWrapper = document.createElement('span');
  iconWrapper.style.flexShrink = '0';
  iconWrapper.style.marginTop = '1px';
  iconWrapper.innerHTML = createIconSvg(toast.variant, iconColor);
  el.appendChild(iconWrapper);

  const content = document.createElement('div');
  content.style.flex = '1';
  content.style.minWidth = '0';

  const messageEl = document.createElement('div');
  messageEl.style.fontWeight = '500';
  messageEl.textContent = toast.message;
  content.appendChild(messageEl);

  if (toast.description) {
    const descEl = document.createElement('div');
    descEl.style.marginTop = '4px';
    descEl.style.opacity = '0.85';
    if (typeof toast.description === 'string') {
      descEl.textContent = toast.description;
    } else {
      descEl.appendChild(toast.description);
    }
    content.appendChild(descEl);
  }

  el.appendChild(content);

  if (toast.variant !== 'loading') {
    const closeBtn = document.createElement('button');
    Object.assign(closeBtn.style, {
      background: 'transparent',
      border: 'none',
      padding: '4px',
      marginTop: '-2px',
      marginRight: '-4px',
      cursor: 'pointer',
      opacity: '0.5',
      color: 'inherit',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    closeBtn.onclick = () => removeToast(toast.id);
    closeBtn.onmouseenter = () => { closeBtn.style.opacity = '1'; };
    closeBtn.onmouseleave = () => { closeBtn.style.opacity = '0.5'; };
    el.appendChild(closeBtn);
  }

  return el;
}

function addToast(toast: Toast, autoDismiss = true): number {
  const container = ensureContainer();
  const el = createToastElement(toast);
  container.appendChild(el);
  activeToasts.set(toast.id, el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  if (autoDismiss && toast.variant !== 'loading') {
    setTimeout(() => removeToast(toast.id), TOAST_DURATION);
  }

  return toast.id;
}

function removeToast(id: number): void {
  const el = activeToasts.get(id);
  if (!el) return;

  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';

  setTimeout(() => {
    el.remove();
    activeToasts.delete(id);
  }, 150);
}

export function showToast(
  message: string,
  link?: { href: string; label: string },
  variant: 'success' | 'error' = 'success'
): void {
  const id = ++toastId;
  let description: HTMLElement | undefined;

  if (link) {
    const a = document.createElement('a');
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = link.label;
    Object.assign(a.style, {
      color: 'inherit',
      fontWeight: '650',
      textDecoration: 'underline',
      textUnderlineOffset: '2px'
    });
    description = a;
  }

  addToast({ id, message, variant, description });
}

export function showSubmittingTicketToast(): number {
  const id = ++toastId;
  addToast({ id, message: 'Submitting ticket...', variant: 'loading' }, false);
  return id;
}

export function dismissToast(id: number | string): void {
  removeToast(typeof id === 'string' ? parseInt(id, 10) : id);
}

export function showTicketCreatedToast(issue?: { identifier?: string; url?: string }): void {
  const id = ++toastId;
  const title = 'Ticket created.';

  if (!issue?.url) {
    const message = issue?.identifier ? `Ticket ${issue.identifier} created.` : title;
    addToast({ id, message, variant: 'success' });
    return;
  }

  const link = document.createElement('a');
  link.href = issue.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = issue.identifier ?? 'Open ticket';
  Object.assign(link.style, {
    color: 'inherit',
    fontWeight: '650',
    textDecoration: 'underline',
    textUnderlineOffset: '2px'
  });

  addToast({ id, message: title, variant: 'success', description: link });
}

export function showTicketCreateErrorToast(message: string): void {
  const id = ++toastId;
  addToast({ id, message, variant: 'error' });
}
