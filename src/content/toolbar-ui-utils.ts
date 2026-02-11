import type { IconNode } from 'lucide';
import { FONT_STACK_SANS, UTILITY_STYLE_TOKENS } from '../shared/visual-tokens';

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderIconSvg(iconNode: IconNode, viewBox = '0 0 24 24'): string {
  const children = iconNode
    .map(([tag, attrs]) => {
      const serializedAttrs = Object.entries(attrs)
        .map(([key, value]) => `${key}="${escapeHtmlAttr(String(value))}"`)
        .join(' ');
      return `<${tag}${serializedAttrs ? ` ${serializedAttrs}` : ''}></${tag}>`;
    })
    .join('');

  return `<svg width="16" height="16" viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block">${children}</svg>`;
}

export function createIcon(iconNode: IconNode, viewBox = '0 0 24 24'): HTMLSpanElement {
  const icon = document.createElement('span');
  icon.style.display = 'inline-grid';
  icon.style.placeItems = 'center';
  icon.style.width = '16px';
  icon.style.height = '16px';
  icon.innerHTML = renderIconSvg(iconNode, viewBox);
  return icon;
}

export function setIcon(icon: HTMLSpanElement, iconNode: IconNode, viewBox = '0 0 24 24'): void {
  icon.innerHTML = renderIconSvg(iconNode, viewBox);
}

export function createEyeToggleIcon(): HTMLSpanElement {
  const icon = document.createElement('span');
  icon.style.display = 'inline-grid';
  icon.style.placeItems = 'center';
  icon.style.width = '16px';
  icon.style.height = '16px';
  icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
    <circle cx="12" cy="12" r="3"></circle>
    <line class="notiv-eye-strike" x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-dasharray="24" stroke-dashoffset="24" style="transition: stroke-dashoffset 150ms ease-out"></line>
  </svg>`;
  return icon;
}

export function setEyeStrikeVisible(icon: HTMLSpanElement, visible: boolean): void {
  const strike = icon.querySelector('.notiv-eye-strike') as SVGLineElement | null;
  if (strike) {
    strike.setAttribute('stroke-dashoffset', visible ? '0' : '24');
  }
}

export function truncateText(value: string, limit: number): string {
  const text = value.trim();
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit - 1)}...`;
}

export function makeTextButton(label: string, subtle = false): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.style.appearance = 'none';
  button.style.boxShadow = 'none';
  button.style.border = `1.25px solid ${UTILITY_STYLE_TOKENS.textButton.border}`;
  button.style.borderRadius = '6px';
  button.style.padding = '7px 10px';
  button.style.background = subtle ? 'transparent' : UTILITY_STYLE_TOKENS.textButton.solidBackground;
  button.style.color = subtle ? UTILITY_STYLE_TOKENS.textButton.subtleText : UTILITY_STYLE_TOKENS.textButton.solidText;
  button.style.fontFamily = FONT_STACK_SANS;
  button.style.fontSize = '12px';
  button.style.fontWeight = '520';
  button.style.cursor = 'pointer';
  button.style.transform = 'scale(1)';
  button.style.transition = 'transform 80ms ease, opacity 80ms ease, filter 80ms ease';
  const resolveMode = (): 'light' | 'dark' =>
    document.documentElement.getAttribute('data-notiv-theme') === 'dark' ? 'dark' : 'light';
  const resolveHoverFilter = (): string => (resolveMode() === 'dark' ? 'brightness(1.1)' : 'brightness(0.92)');
  const resolvePressedFilter = (): string => (resolveMode() === 'dark' ? 'brightness(1.06)' : 'brightness(0.88)');
  button.addEventListener('mouseenter', () => {
    if (button.disabled) {
      return;
    }
    button.style.opacity = '1';
    button.style.filter = resolveHoverFilter();
  });
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.opacity = '1';
    button.style.filter = 'none';
  });
  button.addEventListener('pointerdown', (event) => {
    if (button.disabled || event.button !== 0) {
      return;
    }
    button.style.transform = 'scale(0.97)';
    button.style.filter = resolvePressedFilter();
  });
  button.addEventListener('pointerup', () => {
    if (button.disabled) {
      return;
    }
    button.style.transform = 'scale(1)';
    button.style.filter = resolveHoverFilter();
  });
  button.addEventListener('pointercancel', () => {
    button.style.transform = 'scale(1)';
    button.style.filter = 'none';
  });
  return button;
}

export function setButtonDisabled(button: HTMLButtonElement, disabled: boolean): void {
  button.disabled = disabled;
  button.style.cursor = disabled ? 'not-allowed' : 'pointer';
}

export function makeSpinner(size = 12): HTMLSpanElement {
  const spinner = document.createElement('span');
  spinner.style.width = `${size}px`;
  spinner.style.height = `${size}px`;
  spinner.style.borderRadius = '999px';
  spinner.style.border = `1.25px solid ${UTILITY_STYLE_TOKENS.spinner.track}`;
  spinner.style.borderTopColor = UTILITY_STYLE_TOKENS.spinner.head;
  spinner.style.display = 'inline-block';
  spinner.style.animation = 'notiv-spin 780ms linear infinite';
  return spinner;
}

export function makeSkeletonLine(width: string): HTMLDivElement {
  const line = document.createElement('div');
  line.style.width = width;
  line.style.height = '10px';
  line.style.borderRadius = '999px';
  line.style.background = UTILITY_STYLE_TOKENS.skeletonGradient;
  line.style.backgroundSize = '220% 100%';
  line.style.animation = 'notiv-shimmer 1.15s ease infinite';
  return line;
}
