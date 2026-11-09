/** Layout and motion tokens shared by the learning UI. Colours live in `runtime.ts` (light/dark aware). */

/** 4/8 spacing scale. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 12, md: 16, lg: 24, pill: 999 } as const;

/** Duration ranges: micro 100-180, transition 180-320, celebrate 600-1200 (ms). */
export const motion = {
  micro: 140,
  transition: 240,
  celebrate: 900,
  /** Gap between staggered reveals on a summary. */
  stagger: 120,
} as const;

/** Minimum touch target in logical pixels (48 covers both iOS 44pt and Android 48dp). */
export const MIN_TOUCH = 48;
