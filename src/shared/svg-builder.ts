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
  return createSvgElement('svg', {
    width,
    height,
    viewBox,
    ...attributes,
  });
}

export function createPath(d: string, attributes?: SvgAttributes): SVGPathElement {
  return createSvgElement('path', { d, ...attributes });
}

export function createCircle(
  cx: number,
  cy: number,
  r: number,
  attributes?: SvgAttributes
): SVGCircleElement {
  return createSvgElement('circle', { cx, cy, r, ...attributes });
}

export function createRect(
  x: number,
  y: number,
  width: number,
  height: number,
  attributes?: SvgAttributes
): SVGRectElement {
  return createSvgElement('rect', { x, y, width, height, ...attributes });
}

export function createStrokeIcon(
  width: number,
  height: number,
  pathD: string,
  strokeWidth = 1.5
): SVGSVGElement {
  const svg = createSvg(width, height, '0 0 24 24', {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': strokeWidth,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  svg.appendChild(createPath(pathD));
  return svg;
}

export function createTrashIcon(size = 12): SVGSVGElement {
  return createStrokeIcon(size, size, 'M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14');
}

export function createUserIcon(size = 14): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 24 24', {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.5,
  });
  svg.innerHTML = '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>';
  return svg;
}

export function createCheckIcon(size = 16): SVGSVGElement {
  return createStrokeIcon(size, size, 'M5 12l5 5L20 7', 2);
}

export function createArrowRightIcon(size = 16): SVGSVGElement {
  return createStrokeIcon(size, size, 'M5 12h14M13 5l7 7-7 7', 2);
}

export function createPlusIcon(size = 20): SVGSVGElement {
  return createStrokeIcon(size, size, 'M12 5v14M5 12h14', 2);
}

export function createSpinnerIcon(size = 20): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 24 24', {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
  });
  svg.appendChild(createPath('M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83', {
    opacity: '0.3',
  }));
  return svg;
}

export function createErrorIcon(size = 18): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 24 24', {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
  });
  svg.appendChild(createPath('M18 6L6 18M6 6l12 12'));
  return svg;
}

export function createPriorityIcon(priority: number | null, size = 14): SVGSVGElement {
  const svg = createSvg(size, size, '0 0 16 16');

  if (priority === 1) {
    svg.setAttribute('fill', 'none');
    svg.appendChild(createRect(1, 1, 14, 14, { rx: 3, fill: '#f76b6b' }));
    svg.appendChild(createPath('M8 4v5', {
      stroke: 'white',
      'stroke-width': 2,
      'stroke-linecap': 'round',
    }));
    svg.appendChild(createCircle(8, 11.5, 1, { fill: 'white' }));
  } else if (priority === 2 || priority === 3 || priority === 4) {
    svg.setAttribute('fill', 'currentColor');
    const filledBars = priority === 2 ? 3 : priority === 3 ? 2 : 1;
    const heights = [4, 7, 10];
    heights.forEach((height, i) => {
      svg.appendChild(createRect(2 + i * 4.5, 13 - height, 3, height, {
        rx: 1,
        opacity: i < filledBars ? 1 : 0.25,
      }));
    });
  } else {
    svg.setAttribute('fill', 'currentColor');
    [1, 6.5, 12].forEach((x) => {
      svg.appendChild(createRect(x, 7, 3, 2, { rx: 0.5 }));
    });
  }

  return svg;
}

export function getChevronSvgHtml(className = ''): string {
  const classAttr = className ? ` class="${className}"` : '';
  return `<svg${classAttr} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
}
