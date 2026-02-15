const SVG_NS = 'http://www.w3.org/2000/svg';

type SvgAttributes = Record<string, string | number>;

export function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K,
  attributes?: SvgAttributes
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tagName);
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
  }
  return element;
}

export function createSvg(
  width: number,
  height: number,
  viewBox: string,
  attributes?: SvgAttributes
): SVGSVGElement {
  return createSvgElement('svg', { width, height, viewBox, ...attributes });
}

export function createPath(d: string, attributes?: SvgAttributes): SVGPathElement {
  return createSvgElement('path', { d, ...attributes });
}

export function createCircle(cx: number, cy: number, r: number, attributes?: SvgAttributes): SVGCircleElement {
  return createSvgElement('circle', { cx, cy, r, ...attributes });
}

export function createRect(x: number, y: number, width: number, height: number, attributes?: SvgAttributes): SVGRectElement {
  return createSvgElement('rect', { x, y, width, height, ...attributes });
}

const STROKE_DEFAULTS: SvgAttributes = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

function createStrokeIcon(size: number, pathD: string, strokeWidth = 1.5): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 24 24', { ...STROKE_DEFAULTS, 'stroke-width': strokeWidth });
  svg.appendChild(createPath(pathD));
  return svg;
}

export function createTrashIcon(size = 12): SVGSVGElement {
  return createStrokeIcon(size, 'M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14');
}

export function createUserIcon(size = 14): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 24 24', { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 });
  svg.appendChild(createCircle(12, 8, 4));
  svg.appendChild(createPath('M4 20c0-4 4-6 8-6s8 2 8 6'));
  return svg;
}

export function createCheckIcon(size = 16): SVGSVGElement {
  return createStrokeIcon(size, 'M5 12l5 5L20 7', 2);
}

export function createArrowRightIcon(size = 16): SVGSVGElement {
  return createStrokeIcon(size, 'M5 12h14M13 5l7 7-7 7', 2);
}

export function createCopyIcon(size = 14): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 24 24', { ...STROKE_DEFAULTS, 'stroke-width': 2 });
  svg.appendChild(createRect(9, 9, 13, 13, { rx: 2, ry: 2 }));
  svg.appendChild(createPath('M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'));
  return svg;
}

export function createPlusIcon(size = 20): SVGSVGElement {
  return createStrokeIcon(size, 'M12 5v14M5 12h14', 2);
}

export function createSpinnerIcon(size = 20): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 24 24', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2 });
  svg.appendChild(createPath('M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83', { opacity: '0.3' }));
  return svg;
}

export function createArcSpinnerIcon(): SVGSVGElement {
  const svg = createSvg(24, 24, '0 0 24 24', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
  svg.appendChild(createPath('M12 2a10 10 0 0 1 10 10'));
  return svg;
}

export function createExternalLinkIcon(size = 14): SVGSVGElement {
  return createStrokeIcon(size, 'M7 17L17 7M17 7H7M17 7v10', 2);
}

export function createErrorIcon(size = 18): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 24 24', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' });
  svg.appendChild(createPath('M18 6L6 18M6 6l12 12'));
  return svg;
}

export function createPriorityIcon(priority: number | null, size = 14): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 16 16');

  if (priority === 1) {
    svg.setAttribute('fill', 'none');
    svg.appendChild(createRect(1, 1, 14, 14, { rx: 3, fill: '#f76b6b' }));
    svg.appendChild(createPath('M8 4v5', { stroke: 'white', 'stroke-width': 2, 'stroke-linecap': 'round' }));
    svg.appendChild(createCircle(8, 11.5, 1, { fill: 'white' }));
  } else if (priority === 2 || priority === 3 || priority === 4) {
    svg.setAttribute('fill', 'currentColor');
    const filledBars = priority === 2 ? 3 : priority === 3 ? 2 : 1;
    [4, 7, 10].forEach((height, i) => {
      svg.appendChild(createRect(2 + i * 4.5, 13 - height, 3, height, { rx: 1, opacity: i < filledBars ? 1 : 0.25 }));
    });
  } else {
    svg.setAttribute('fill', 'currentColor');
    [1, 6.5, 12].forEach((x) => svg.appendChild(createRect(x, 7, 3, 2, { rx: 0.5 })));
  }

  return svg;
}

export function createSettingsIcon(size = 14): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 24 24', { ...STROKE_DEFAULTS, 'stroke-width': 1.5 });
  svg.appendChild(createPath('M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'));
  svg.appendChild(createCircle(12, 12, 3));
  return svg;
}

export function createEmptyStateIcon(size = 24): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 24 24', { ...STROKE_DEFAULTS, 'stroke-width': 1.5 });
  svg.appendChild(createPath('M9 12h6M12 9v6M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z'));
  return svg;
}

export function createChevronIcon(size = 10, className?: string): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 24 24', { ...STROKE_DEFAULTS, 'stroke-width': 2.5 });
  if (className) svg.classList.add(className);
  svg.appendChild(createPath('M6 9l6 6 6-6'));
  return svg;
}

export function getChevronSvgHtml(className = ''): string {
  const classAttr = className ? ` class="${className}"` : '';
  return `<svg${classAttr} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
}
