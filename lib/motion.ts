import type { Transition, Variants } from 'framer-motion'

/**
 * AXIS_OS motion language.
 *
 * One curve, five durations. Motion here is a readout of state change, not
 * decoration: nothing travels further than 8px, nothing runs longer than
 * 240ms, and nothing animates that the user did not just cause. Anything
 * that wants to break those rules is decoration and should be dropped
 * instead of tuned.
 */

/** Mirrors --ease-out-200 and the tailwind `ease-out-200` timing function. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const DUR = {
  /** Press and release. */
  press: 0.12,
  /** Colour and opacity crossfades. */
  fast: 0.15,
  /** Default: entrances, route swaps, palette. */
  base: 0.18,
  /** Anything that also translates: panels, drawers, drag settle. */
  slow: 0.24,
  /** Numeric count-up. */
  count: 0.4,
} as const

/** 60ms, fast enough that an eight-row list still reads as one gesture. */
export const STAGGER = 0.06
/** Past this many rows the stagger stops paying for itself and just feels slow. */
export const STAGGER_MAX = 8

export const transition: Transition = { duration: DUR.base, ease: EASE_OUT }

/** Parent of a staggered list. Pair with `listItem` on each child. */
export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER, delayChildren: 0.02 } },
}

export const listItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition },
}

/**
 * Caps the stagger so a 60-row expense table does not take four seconds to
 * arrive. Use when driving delays manually rather than via variants.
 */
export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_MAX) * STAGGER
}

/** Press feedback. Spread onto a motion element. */
export const press = {
  whileTap: { scale: 0.98 },
  transition: { duration: DUR.press, ease: EASE_OUT },
} as const

/** Modal scrim. */
export const scrim = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DUR.fast, ease: EASE_OUT },
} as const

/** Overlay panel: command palette, popovers anchored to the viewport top. */
export const panel = {
  initial: { y: -8, scale: 0.98 },
  animate: { y: 0, scale: 1 },
  exit: { y: -4, scale: 0.99 },
  transition: { duration: DUR.base, ease: EASE_OUT },
} as const

/** Route change. Deliberately near-subliminal, because chrome must not move. */
export const route = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DUR.base, ease: EASE_OUT },
} as const

/**
 * Recharts series animation. Recharts only accepts named easings, so
 * 'ease-out' stands in for the house curve. 400ms matches DUR.count, so a
 * chart and the figure sitting above it settle together instead of racing.
 *
 * Spread onto every <Bar>, <Line> and <Area>: the library default is a
 * bouncy 1500ms `ease`, which is both too long and the wrong shape here.
 */
export const CHART_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 400,
  animationEasing: 'ease-out',
} as const
