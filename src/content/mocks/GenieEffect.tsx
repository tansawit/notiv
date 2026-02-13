import { useRef, useEffect, useState, useMemo } from 'react';

interface GenieConfig {
  pinchAmount: number;
  pinchCurve: number;
  concaveStrength: number;
  verticalSqueeze: number;
}

interface GenieEffectProps {
  children: React.ReactNode;
  active: boolean;
  config: GenieConfig;
  targetPosition: { x: number; y: number };
  onComplete?: () => void;
  duration?: number;
}

const SLICE_COUNT = 20;

export function GenieEffect({
  children,
  active,
  config,
  targetPosition,
  onComplete,
  duration = 400,
}: GenieEffectProps) {
  const [progress, setProgress] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 280, height: 300, top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      });
    }
  }, [active]);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      startTimeRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    startTimeRef.current = performance.now();

    const animate = () => {
      if (startTimeRef.current === null) return;

      const elapsed = performance.now() - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      setProgress(eased);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, duration, onComplete]);

  const slices = useMemo(() => {
    const sliceHeight = dimensions.height / SLICE_COUNT;
    const result = [];

    for (let i = 0; i < SLICE_COUNT; i++) {
      const normalizedY = i / (SLICE_COUNT - 1);

      const pinchFactor = Math.pow(normalizedY, config.pinchCurve) * config.pinchAmount * progress;
      const scaleX = Math.max(0.02, 1 - pinchFactor);

      const concaveBow = Math.sin(normalizedY * Math.PI) * config.concaveStrength * progress * 0.15;
      const finalScaleX = Math.max(0.02, scaleX - concaveBow);

      const verticalCompression = Math.pow(normalizedY, config.pinchCurve * 0.8) * config.verticalSqueeze * progress;
      const scaleY = Math.max(0.1, 1 - verticalCompression);

      const targetOffsetX = (targetPosition.x - (dimensions.left + dimensions.width / 2)) * progress * normalizedY;
      const targetOffsetY = (targetPosition.y - (dimensions.top + dimensions.height)) * progress * Math.pow(normalizedY, 0.5);

      let cumulativeY = 0;
      for (let j = 0; j < i; j++) {
        const prevNormalizedY = j / (SLICE_COUNT - 1);
        const prevVerticalCompression = Math.pow(prevNormalizedY, config.pinchCurve * 0.8) * config.verticalSqueeze * progress;
        const prevScaleY = Math.max(0.1, 1 - prevVerticalCompression);
        cumulativeY += sliceHeight * prevScaleY;
      }

      result.push({
        index: i,
        top: i * sliceHeight,
        height: sliceHeight,
        scaleX: finalScaleX,
        scaleY,
        translateX: targetOffsetX,
        translateY: targetOffsetY + (cumulativeY - i * sliceHeight),
        opacity: 1 - progress * 0.5 * normalizedY,
      });
    }

    return result;
  }, [progress, config, dimensions, targetPosition]);

  const showOriginal = !active || progress === 0;

  return (
    <>
      {/* Original content - hidden during animation */}
      <div
        ref={containerRef}
        style={{
          visibility: showOriginal ? 'visible' : 'hidden',
          position: showOriginal ? 'relative' : 'absolute',
          pointerEvents: showOriginal ? 'auto' : 'none',
        }}
      >
        {children}
      </div>

      {/* Sliced animation layer */}
      {active && progress > 0 && (
        <div
          style={{
            position: 'fixed',
            top: dimensions.top,
            left: dimensions.left,
            width: dimensions.width,
            height: dimensions.height,
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        >
          {slices.map((slice) => (
            <div
              key={slice.index}
              style={{
                position: 'absolute',
                top: slice.top,
                left: 0,
                width: '100%',
                height: slice.height + 1,
                overflow: 'hidden',
                transform: `
                  translateX(${slice.translateX}px)
                  translateY(${slice.translateY}px)
                  scaleX(${slice.scaleX})
                  scaleY(${slice.scaleY})
                `,
                transformOrigin: 'center top',
                opacity: slice.opacity,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -slice.top,
                  left: 0,
                  width: dimensions.width,
                  height: dimensions.height,
                }}
              >
                {children}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default GenieEffect;
