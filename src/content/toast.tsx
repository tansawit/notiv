import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Toaster, toast } from 'sonner';
import 'sonner/dist/styles.css';
import { FONT_STACK_SANS, getVisualModeTokens } from '../shared/visual-tokens';

type ToastVariant = 'success' | 'error';
type NotivThemeMode = 'light' | 'dark';

let toasterRoot: Root | null = null;
let toasterHost: HTMLDivElement | null = null;
let renderedTheme: NotivThemeMode | null = null;
let listenersBound = false;
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

function getTheme(): NotivThemeMode {
  const explicitTheme = document.documentElement.getAttribute('data-notiv-theme');
  if (explicitTheme === 'dark' || explicitTheme === 'light') {
    return explicitTheme;
  }
  return systemThemeQuery.matches ? 'dark' : 'light';
}

function renderToaster(theme: NotivThemeMode): void {
  if (!toasterRoot) {
    return;
  }
  const tokens = getVisualModeTokens(theme);
  renderedTheme = theme;
  toasterRoot.render(
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      theme={theme}
      toastOptions={{
        style: {
          fontFamily: FONT_STACK_SANS,
          background: tokens.toast.background,
          color: tokens.toast.color,
          border: `1px solid ${tokens.toast.border}`
        }
      }}
    />
  );
}

function syncToasterTheme(): void {
  const nextTheme = getTheme();
  if (!toasterRoot || renderedTheme === nextTheme) {
    return;
  }
  renderToaster(nextTheme);
}

function ensureToasterMounted(): void {
  if (toasterRoot && toasterHost) {
    syncToasterTheme();
    return;
  }

  toasterHost = document.createElement('div');
  toasterHost.setAttribute('data-notiv-ui', 'true');
  toasterHost.style.position = 'fixed';
  toasterHost.style.right = '0';
  toasterHost.style.bottom = '0';
  toasterHost.style.zIndex = '2147483647';
  document.documentElement.appendChild(toasterHost);

  toasterRoot = createRoot(toasterHost);
  renderToaster(getTheme());

  if (!listenersBound) {
    const handleThemeChange = (): void => {
      syncToasterTheme();
    };
    systemThemeQuery.addEventListener('change', handleThemeChange);
    window.addEventListener('notiv-theme-change', handleThemeChange as EventListener);
    listenersBound = true;
  }
}

export function showToast(
  message: string,
  link?: { href: string; label: string },
  variant: ToastVariant = 'success'
): void {
  ensureToasterMounted();
  const text = link ? `${message} ${link.label}` : message;
  if (variant === 'error') {
    toast.error(text);
    return;
  }
  toast.success(text);
}

export function showSubmittingTicketToast(): string | number {
  ensureToasterMounted();
  return toast.loading('Submitting ticket...');
}

export function dismissToast(toastId: string | number): void {
  ensureToasterMounted();
  toast.dismiss(toastId);
}

export function showTicketCreatedToast(issue?: { identifier?: string; url?: string }): void {
  ensureToasterMounted();
  const title = 'Ticket created.';
  if (!issue?.url) {
    if (issue?.identifier) {
      toast.success(`Ticket ${issue.identifier} created.`);
      return;
    }
    toast.success(title);
    return;
  }

  toast.success(title, {
    description: (
      <a
        href={issue.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'inherit',
          fontWeight: 650,
          textDecoration: 'underline',
          textUnderlineOffset: '2px'
        }}
      >
        {issue.identifier ?? 'Open ticket'}
      </a>
    )
  });
}

export function showTicketCreateErrorToast(message: string): void {
  ensureToasterMounted();
  toast.error(message);
}
