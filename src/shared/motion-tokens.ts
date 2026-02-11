export const MOTION = {
  duration: {
    instant: 0.08,
    quick: 0.12,
    normal: 0.2,
    morph: 0.32,
  },

  stagger: {
    fast: 0.03,
    normal: 0.05,
  },

  easing: {
    snap: 'cubic-bezier(0.22, 1, 0.36, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type MotionDuration = keyof typeof MOTION.duration;
export type MotionEasing = keyof typeof MOTION.easing;
