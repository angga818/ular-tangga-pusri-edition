/**
 * Framer Motion Animation Variants & Utilities
 * Centralized animation definitions for consistent, performant animations
 */

import { Variants } from 'framer-motion';

// ============================================
// PAGE / SCREEN TRANSITIONS
// ============================================

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const pageTransition = {
  type: 'tween' as const,
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

// ============================================
// BUTTON ANIMATIONS
// ============================================

export const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  focus: { scale: 1.01, boxShadow: '0 0 0 3px rgba(251, 191, 36, 0.4)' },
};

export const buttonTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 17,
};

export const iconButtonVariants = {
  initial: { scale: 1, rotate: 0 },
  hover: { scale: 1.1, rotate: 3 },
  tap: { scale: 0.95 },
};

export const iconButtonTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 20,
};

// ============================================
// CARD / PANEL ANIMATIONS
// ============================================

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.98 },
  hover: { y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)' },
};

export const cardTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 20,
};

export const panelVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const panelTransition = {
  type: 'tween' as const,
  duration: 0.3,
  ease: 'easeOut',
};

// ============================================
// MODAL / OVERLAY ANIMATIONS
// ============================================

export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContentVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

export const modalTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
};

export const drawerVariants: Variants = {
  initial: { opacity: 0, x: '100%' },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: '100%' },
};

export const drawerTransition = {
  type: 'tween' as const,
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

// ============================================
// INPUT / FORM ANIMATIONS
// ============================================

export const inputVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  focus: { scale: 1.01, boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.3)' },
  error: { x: [-8, 8, -6, 6, -4, 4, 0] },
};

export const inputTransition = {
  type: 'tween' as const,
  duration: 0.2,
};

export const labelVariants: Variants = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
};

export const selectVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  hover: { borderColor: 'rgb(251 191 36)' },
  focus: { borderColor: 'rgb(251 191 36)', boxShadow: '0 0 0 3px rgba(251, 191, 36, 0.2)' },
};

// ============================================
// LIST / GRID ANIMATIONS
// ============================================

export const listContainerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 12, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0 },
};

export const layoutItemTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

export const gridStaggerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
};

export const gridItemVariants: Variants = {
  initial: { opacity: 0, scale: 0.92, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  hover: { scale: 1.03, y: -4, zIndex: 10 },
};

// ============================================
// TOAST / NOTIFICATION ANIMATIONS
// ============================================

export const toastVariants: Variants = {
  initial: { opacity: 0, y: -24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.96 },
};

export const toastTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 30,
};

// ============================================
// LOADING / SKELETON ANIMATIONS
// ============================================

export const pulseVariants: Variants = {
  initial: { opacity: 0.6 },
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const spinVariants: Variants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: 'linear' },
  },
};

export const bounceVariants: Variants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const waveVariants: Variants = {
  animate: {
    scaleX: [1, 1.1, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

// ============================================
// CHARACTER / AVATAR ANIMATIONS
// ============================================

export const characterBobVariants: Variants = {
  animate: {
    y: [0, -4, 0],
    transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const characterEntranceVariants: Variants = {
  initial: { opacity: 0, scale: 0.8, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.8, y: -20 },
};

export const characterEntranceTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 20,
};

export const avatarRingVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    borderColor: ['rgb(251 191 36)', 'rgb(245 158 11)', 'rgb(251 191 36)'],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// ============================================
// DICE ANIMATIONS
// ============================================

export const diceRollVariants: Variants = {
  initial: { rotateX: 0, rotateY: 0, scale: 1 },
  rolling: {
    rotateX: [0, 720, 180],
    rotateY: [0, 360, 90],
    scale: [1, 1.1, 1],
    transition: { duration: 1.2, ease: 'easeInOut' },
  },
  settled: { rotateX: 180, rotateY: 90, scale: 1 },
};

export const diceFaceVariants: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.5 },
};

// ============================================
// PROGRESS BAR ANIMATIONS
// ============================================

export const progressVariants: Variants = {
  initial: { width: '0%', opacity: 0 },
  animate: (target: number) => ({
    width: `${target}%`,
    opacity: 1,
    transition: { duration: 0.8, ease: 'easeOut' },
  }),
  exit: { width: '0%', opacity: 0 },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Creates a staggered delay based on index
 */
export function staggerDelay(index: number, baseDelay = 0.05, startDelay = 0.1): number {
  return startDelay + index * baseDelay;
}

/**
 * Creates spring transition with customizable stiffness/damping
 */
export function springTransition(stiffness = 400, damping = 25) {
  return { type: 'spring' as const, stiffness, damping };
}

/**
 * Creates tween transition with customizable duration/ease
 */
export function tweenTransition(duration = 0.3, ease: string = 'easeOut') {
  return { type: 'tween' as const, duration, ease };
}

/**
 * Randomized entrance delay for organic feel
 */
export function randomDelay(min = 0, max = 0.3): number {
  return Math.random() * (max - min) + min;
}

/**
 * Reduced motion check - returns simplified variants if prefers-reduced-motion
 */
export function getReducedMotionVariants<T extends Variants>(
  normalVariants: T,
  reducedVariants: T
): T {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return reducedVariants;
  }
  return normalVariants;
}

// Reduced motion variants
export const reducedPageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const reducedCardVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const reducedModalVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};