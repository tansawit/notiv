import { describe, expect, it } from 'vitest';
import type { ElementSelection } from '../shared/types';
import { resolveSelectionLabel } from './selection-label';

function makeSelection(overrides: Partial<ElementSelection>): ElementSelection {
  return {
    elementPath: 'div:nth-of-type(1)',
    tag: 'div',
    elementLabel: undefined,
    classes: [],
    componentName: undefined,
    reactComponents: [],
    contentPreview: undefined,
    href: undefined,
    boundingBox: {
      x: 0,
      y: 0,
      width: 100,
      height: 40
    },
    accessibility: {},
    ...overrides
  };
}

describe('resolveSelectionLabel', () => {
  it('labels graphics and svg consistently', () => {
    expect(resolveSelectionLabel(makeSelection({ tag: 'svg' }))).toBe('icon');
    expect(resolveSelectionLabel(makeSelection({ tag: 'path' }))).toBe('graphic element');
  });

  it('labels code and pre blocks', () => {
    expect(resolveSelectionLabel(makeSelection({ tag: 'code', contentPreview: 'const answer = 42;' }))).toBe('code: `const answer = 42;`');
    expect(resolveSelectionLabel(makeSelection({ tag: 'pre' }))).toBe('code block');
  });

  it('uses content preview for inputs and textarea', () => {
    expect(resolveSelectionLabel(makeSelection({ tag: 'input', contentPreview: 'Email address' }))).toBe('input "Email address"');
    expect(resolveSelectionLabel(makeSelection({ tag: 'textarea', contentPreview: 'Write your feedback' }))).toBe('textarea "Write your feedback"');
  });
});
