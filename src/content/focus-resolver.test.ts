import { describe, expect, it } from 'vitest';
import { resolveDraftLabel, resolveFocusBoundingBox } from './focus-resolver';

describe('resolveDraftLabel', () => {
  it('uses element label, then component, then tag fallback', () => {
    expect(
      resolveDraftLabel({
        element: 'button',
        elementPath: 'button',
        elementLabel: 'Save',
        anchorX: 0,
        anchorY: 0
      })
    ).toBe('Save');

    expect(
      resolveDraftLabel({
        element: 'button',
        elementPath: 'button',
        componentName: 'SaveButton',
        anchorX: 0,
        anchorY: 0
      })
    ).toBe('SaveButton');

    expect(
      resolveDraftLabel({
        element: 'button',
        elementPath: 'button',
        anchorX: 0,
        anchorY: 0
      })
    ).toBe('button');
  });
});

describe('resolveFocusBoundingBox', () => {
  it('builds a viewport box from fallback anchor when element cannot be resolved', () => {
    const box = resolveFocusBoundingBox({
      elementPath: '.missing',
      fallbackBoundingBox: { x: 0, y: 0, width: 80, height: 20 },
      anchorX: 200,
      anchorY: 100,
      fixed: true
    });

    expect(box).toEqual({
      x: 160,
      y: 90,
      width: 80,
      height: 20
    });
  });
});
