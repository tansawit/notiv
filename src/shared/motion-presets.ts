import type { Transition, Variants } from 'framer-motion';

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

export const springTransitionSoft: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
  mass: 0.8,
};

export const buttonHoverScale = { scale: 1.02 };
export const buttonTapScale = { scale: 0.96 };
export const buttonTapScaleWithY = { scale: 0.96, y: 1 };

export const iconButtonHoverScale = { scale: 1.1 };
export const iconButtonTapScale = { scale: 0.9 };

export function createDisabledButtonHover(disabled: boolean) {
  return { scale: disabled ? 1 : 1.02 };
}

export function createDisabledButtonTap(disabled: boolean, includeY = false) {
  if (includeY) {
    return { scale: disabled ? 1 : 0.96, y: disabled ? 0 : 1 };
  }
  return { scale: disabled ? 1 : 0.96 };
}

export const viewVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    y: direction * 8,
    scale: 0.98,
  }),
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction * -4,
    scale: 0.98,
  }),
};

export const viewTransition: Transition = springTransitionSoft;
