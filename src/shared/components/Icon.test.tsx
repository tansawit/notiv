import { afterEach, describe, expect, it, beforeEach } from 'vitest';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { Icon } from './Icon';

describe('Icon', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders an SVG element', () => {
    act(() => {
      root.render(<Icon path="M5 12h14" />);
    });

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses default size of 16', () => {
    act(() => {
      root.render(<Icon path="M5 12h14" />);
    });

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('16');
    expect(svg?.getAttribute('height')).toBe('16');
  });

  it('accepts custom size', () => {
    act(() => {
      root.render(<Icon path="M5 12h14" size={24} />);
    });

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('24');
    expect(svg?.getAttribute('height')).toBe('24');
  });

  it('uses default strokeWidth of 2', () => {
    act(() => {
      root.render(<Icon path="M5 12h14" />);
    });

    const path = container.querySelector('path');
    expect(path?.getAttribute('stroke-width')).toBe('2');
  });

  it('accepts custom strokeWidth', () => {
    act(() => {
      root.render(<Icon path="M5 12h14" strokeWidth={1.5} />);
    });

    const path = container.querySelector('path');
    expect(path?.getAttribute('stroke-width')).toBe('1.5');
  });

  it('renders the path with correct d attribute', () => {
    act(() => {
      root.render(<Icon path="M12 5v14M5 12h14" />);
    });

    const path = container.querySelector('path');
    expect(path?.getAttribute('d')).toBe('M12 5v14M5 12h14');
  });

  it('uses stroke styling', () => {
    act(() => {
      root.render(<Icon path="M5 12h14" />);
    });

    const path = container.querySelector('path');
    expect(path?.getAttribute('stroke')).toBe('currentColor');
    expect(path?.getAttribute('fill')).toBe('none');
    expect(path?.getAttribute('stroke-linecap')).toBe('round');
    expect(path?.getAttribute('stroke-linejoin')).toBe('round');
  });
});
