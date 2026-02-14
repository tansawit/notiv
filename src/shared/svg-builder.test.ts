import { describe, expect, it } from 'vitest';
import {
  createSvgElement,
  createSvg,
  createPath,
  createCircle,
  createRect,
  createStrokeIcon,
  createTrashIcon,
  createUserIcon,
  createCheckIcon,
  createArrowRightIcon,
  createPlusIcon,
  createSpinnerIcon,
  createErrorIcon,
  createPriorityIcon,
  getChevronSvgHtml
} from './svg-builder';

describe('createSvgElement', () => {
  it('creates an SVG element with correct namespace', () => {
    const element = createSvgElement('path');
    expect(element.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(element.tagName).toBe('path');
  });

  it('sets attributes on element', () => {
    const element = createSvgElement('rect', { x: 10, y: 20, width: 100, height: 50 });
    expect(element.getAttribute('x')).toBe('10');
    expect(element.getAttribute('y')).toBe('20');
    expect(element.getAttribute('width')).toBe('100');
    expect(element.getAttribute('height')).toBe('50');
  });

  it('handles string attributes', () => {
    const element = createSvgElement('path', { d: 'M0 0L10 10', fill: 'red' });
    expect(element.getAttribute('d')).toBe('M0 0L10 10');
    expect(element.getAttribute('fill')).toBe('red');
  });
});

describe('createSvg', () => {
  it('creates SVG with dimensions and viewBox', () => {
    const svg = createSvg(100, 50, '0 0 100 50');
    expect(svg.tagName).toBe('svg');
    expect(svg.getAttribute('width')).toBe('100');
    expect(svg.getAttribute('height')).toBe('50');
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 50');
  });

  it('merges additional attributes', () => {
    const svg = createSvg(24, 24, '0 0 24 24', { fill: 'none', stroke: 'currentColor' });
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
  });
});

describe('createPath', () => {
  it('creates path with d attribute', () => {
    const path = createPath('M5 12h14');
    expect(path.tagName).toBe('path');
    expect(path.getAttribute('d')).toBe('M5 12h14');
  });

  it('accepts additional attributes', () => {
    const path = createPath('M0 0L10 10', { stroke: 'red', 'stroke-width': 2 });
    expect(path.getAttribute('stroke')).toBe('red');
    expect(path.getAttribute('stroke-width')).toBe('2');
  });
});

describe('createCircle', () => {
  it('creates circle with correct attributes', () => {
    const circle = createCircle(12, 8, 4);
    expect(circle.tagName).toBe('circle');
    expect(circle.getAttribute('cx')).toBe('12');
    expect(circle.getAttribute('cy')).toBe('8');
    expect(circle.getAttribute('r')).toBe('4');
  });

  it('accepts additional attributes', () => {
    const circle = createCircle(10, 10, 5, { fill: 'blue' });
    expect(circle.getAttribute('fill')).toBe('blue');
  });
});

describe('createRect', () => {
  it('creates rect with correct attributes', () => {
    const rect = createRect(0, 0, 100, 50);
    expect(rect.tagName).toBe('rect');
    expect(rect.getAttribute('x')).toBe('0');
    expect(rect.getAttribute('y')).toBe('0');
    expect(rect.getAttribute('width')).toBe('100');
    expect(rect.getAttribute('height')).toBe('50');
  });

  it('accepts additional attributes', () => {
    const rect = createRect(5, 5, 20, 10, { rx: 3, fill: 'green' });
    expect(rect.getAttribute('rx')).toBe('3');
    expect(rect.getAttribute('fill')).toBe('green');
  });
});

describe('createStrokeIcon', () => {
  it('creates stroke-based icon SVG', () => {
    const icon = createStrokeIcon(16, 16, 'M5 12l5 5L20 7');
    expect(icon.tagName).toBe('svg');
    expect(icon.getAttribute('width')).toBe('16');
    expect(icon.getAttribute('height')).toBe('16');
    expect(icon.getAttribute('fill')).toBe('none');
    expect(icon.getAttribute('stroke')).toBe('currentColor');
    expect(icon.getAttribute('stroke-width')).toBe('1.5');
  });

  it('uses custom stroke width', () => {
    const icon = createStrokeIcon(24, 24, 'M0 0', 3);
    expect(icon.getAttribute('stroke-width')).toBe('3');
  });

  it('contains the path element', () => {
    const icon = createStrokeIcon(16, 16, 'M5 12h14');
    const path = icon.querySelector('path');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toBe('M5 12h14');
  });
});

describe('icon creation functions', () => {
  it('createTrashIcon creates trash icon', () => {
    const icon = createTrashIcon(12);
    expect(icon.getAttribute('width')).toBe('12');
    expect(icon.getAttribute('height')).toBe('12');
    expect(icon.querySelector('path')).not.toBeNull();
  });

  it('createUserIcon creates user icon', () => {
    const icon = createUserIcon(14);
    expect(icon.getAttribute('width')).toBe('14');
    expect(icon.querySelector('circle')).not.toBeNull();
  });

  it('createCheckIcon creates check icon', () => {
    const icon = createCheckIcon(16);
    expect(icon.getAttribute('width')).toBe('16');
    const path = icon.querySelector('path');
    expect(path?.getAttribute('d')).toContain('l5 5');
  });

  it('createArrowRightIcon creates arrow icon', () => {
    const icon = createArrowRightIcon(16);
    expect(icon.getAttribute('width')).toBe('16');
    expect(icon.querySelector('path')).not.toBeNull();
  });

  it('createPlusIcon creates plus icon', () => {
    const icon = createPlusIcon(20);
    expect(icon.getAttribute('width')).toBe('20');
    const path = icon.querySelector('path');
    expect(path?.getAttribute('d')).toContain('v14');
  });

  it('createSpinnerIcon creates spinner icon', () => {
    const icon = createSpinnerIcon(20);
    expect(icon.getAttribute('width')).toBe('20');
    const path = icon.querySelector('path');
    expect(path?.getAttribute('opacity')).toBe('0.3');
  });

  it('createErrorIcon creates error/close icon', () => {
    const icon = createErrorIcon(18);
    expect(icon.getAttribute('width')).toBe('18');
    const path = icon.querySelector('path');
    expect(path?.getAttribute('d')).toContain('6L6 18');
  });
});

describe('createPriorityIcon', () => {
  it('creates urgent priority icon (priority 1)', () => {
    const icon = createPriorityIcon(1, 14);
    expect(icon.getAttribute('width')).toBe('14');
    const rect = icon.querySelector('rect');
    expect(rect?.getAttribute('fill')).toBe('#f76b6b');
    expect(icon.querySelector('circle')).not.toBeNull();
  });

  it('creates high priority icon (priority 2)', () => {
    const icon = createPriorityIcon(2, 14);
    expect(icon.getAttribute('fill')).toBe('currentColor');
    const rects = icon.querySelectorAll('rect');
    expect(rects.length).toBe(3);
  });

  it('creates medium priority icon (priority 3)', () => {
    const icon = createPriorityIcon(3, 14);
    const rects = icon.querySelectorAll('rect');
    expect(rects.length).toBe(3);
  });

  it('creates low priority icon (priority 4)', () => {
    const icon = createPriorityIcon(4, 14);
    const rects = icon.querySelectorAll('rect');
    expect(rects.length).toBe(3);
  });

  it('creates no priority icon (priority null)', () => {
    const icon = createPriorityIcon(null, 14);
    const rects = icon.querySelectorAll('rect');
    expect(rects.length).toBe(3);
  });
});

describe('getChevronSvgHtml', () => {
  it('returns chevron SVG HTML string', () => {
    const html = getChevronSvgHtml();
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('<path d="M6 9l6 6 6-6"/>');
  });

  it('includes class when provided', () => {
    const html = getChevronSvgHtml('dropdown-icon');
    expect(html).toContain('class="dropdown-icon"');
  });

  it('omits class attribute when empty', () => {
    const html = getChevronSvgHtml('');
    expect(html).not.toContain('class=');
  });
});
