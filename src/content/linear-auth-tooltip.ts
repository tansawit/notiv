import { FONT_STACK_SERIF, getVisualModeTokens } from '../shared/visual-tokens';
import { getNotivThemeMode } from './theme-mode';

interface TooltipAnchor {
  x: number;
  y: number;
}

interface LinearAuthTooltipController {
  clear: () => void;
  show: (message: string, anchor?: TooltipAnchor) => void;
}

export function createLinearAuthTooltipController(): LinearAuthTooltipController {
  let tooltipNode: HTMLDivElement | null = null;
  let tooltipTimer: number | null = null;

  const clear = (): void => {
    if (tooltipTimer) {
      window.clearTimeout(tooltipTimer);
      tooltipTimer = null;
    }
    if (tooltipNode) {
      tooltipNode.remove();
      tooltipNode = null;
    }
  };

  const show = (message: string, anchor?: TooltipAnchor): void => {
    clear();
    const visualTokens = getVisualModeTokens(getNotivThemeMode());

    const tooltip = document.createElement('div');
    tooltip.setAttribute('data-notiv-ui', 'true');
    tooltip.style.position = 'fixed';
    tooltip.style.left = '0';
    tooltip.style.top = '0';
    tooltip.style.maxWidth = '360px';
    tooltip.style.padding = '7px 10px';
    tooltip.style.borderRadius = '6px';
    tooltip.style.background = visualTokens.floatingTooltip.background;
    tooltip.style.color = visualTokens.floatingTooltip.color;
    tooltip.style.border = `1.25px solid ${visualTokens.floatingTooltip.border}`;
    tooltip.style.fontFamily = FONT_STACK_SERIF;
    tooltip.style.fontSize = '12px';
    tooltip.style.fontWeight = '520';
    tooltip.style.lineHeight = '1.3';
    tooltip.style.letterSpacing = '0.01em';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '2147483647';
    tooltip.style.boxShadow = visualTokens.floatingTooltip.shadow;
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateY(3px)';
    tooltip.style.transition = 'opacity 120ms ease, transform 120ms ease';
    tooltip.textContent = message;
    document.documentElement.appendChild(tooltip);

    const margin = 12;
    const rect = tooltip.getBoundingClientRect();
    const originX = anchor?.x ?? window.innerWidth - 104;
    const originY = anchor?.y ?? window.innerHeight - 68;
    let left = originX + 14;
    let top = originY - rect.height - 12;

    if (left + rect.width > window.innerWidth - margin) {
      left = originX - rect.width - 14;
    }
    if (left < margin) {
      left = margin;
    }

    if (top < margin) {
      top = originY + 14;
    }
    if (top + rect.height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - rect.height - margin);
    }

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    window.requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    });

    tooltipNode = tooltip;
    tooltipTimer = window.setTimeout(() => {
      if (!tooltipNode) {
        return;
      }
      tooltipNode.style.opacity = '0';
      tooltipNode.style.transform = 'translateY(3px)';
      window.setTimeout(() => {
        clear();
      }, 140);
    }, 5200);
  };

  return { clear, show };
}
