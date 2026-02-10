import { describe, expect, it } from 'vitest';
import { resolveCropGeometry } from './screenshot';

describe('resolveCropGeometry', () => {
  it('scales by device pixel ratio and caps output dimension', () => {
    const geometry = resolveCropGeometry({
      bitmapWidth: 4000,
      bitmapHeight: 2400,
      rect: { x: 100, y: 150, width: 1200, height: 600 },
      devicePixelRatio: 2,
      maxDimension: 1100
    });

    expect(geometry.sx).toBe(200);
    expect(geometry.sy).toBe(300);
    expect(geometry.safeWidth).toBe(2400);
    expect(geometry.safeHeight).toBe(1200);
    expect(geometry.outputWidth).toBe(1100);
    expect(geometry.outputHeight).toBe(550);
  });

  it('clamps crop area when requested rect extends beyond bitmap bounds', () => {
    const geometry = resolveCropGeometry({
      bitmapWidth: 500,
      bitmapHeight: 400,
      rect: { x: 460, y: 380, width: 120, height: 80 },
      devicePixelRatio: 1
    });

    expect(geometry.sx).toBe(460);
    expect(geometry.sy).toBe(380);
    expect(geometry.safeWidth).toBe(40);
    expect(geometry.safeHeight).toBe(20);
    expect(geometry.outputWidth).toBe(40);
    expect(geometry.outputHeight).toBe(20);
  });

  it('keeps minimum 1x1 crop when rectangle starts outside bounds', () => {
    const geometry = resolveCropGeometry({
      bitmapWidth: 100,
      bitmapHeight: 100,
      rect: { x: 999, y: 999, width: 30, height: 30 },
      devicePixelRatio: 1
    });

    expect(geometry.safeWidth).toBe(1);
    expect(geometry.safeHeight).toBe(1);
    expect(geometry.outputWidth).toBe(1);
    expect(geometry.outputHeight).toBe(1);
  });
});
