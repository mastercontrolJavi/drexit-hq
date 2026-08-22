/**
 * Demo fixtures are generated relative to the moment the app loads, never
 * against hardcoded calendar dates.
 *
 * The previous fixtures were pinned to March to May 2026. Once the real date
 * moved past them the demo showed an empty current month, a £0 spend, a dead
 * weigh-in streak and a countdown reading T-0. A portfolio piece that decays
 * a little more every day it is not touched. Anchoring to `now` means the demo
 * is always mid-month, always mid-streak, always alive.
 *
 * Everything here is deterministic: a seeded generator rather than
 * Math.random, so a given day produces the same numbers on every render and
 * on both sides of the network.
 */

/** Frozen once per process so a single render never straddles midnight. */
export const NOW = new Date()

export function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isoTime(d: Date, hour = 9, minute = 0): string {
  const at = new Date(d)
  at.setHours(hour, minute, 0, 0)
  return at.toISOString()
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

export function addMonths(d: Date, n: number): Date {
  const out = new Date(d)
  out.setMonth(out.getMonth() + n)
  return out
}

export function daysAgo(n: number): Date {
  return addDays(NOW, -n)
}

/** Start of the month `n` months back from now. */
export function monthStart(n: number): Date {
  const out = new Date(NOW.getFullYear(), NOW.getMonth() - n, 1)
  return out
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

/** Today's day-of-month, or how far into the current month the demo sits. */
export const TODAY_DOM = NOW.getDate()

/**
 * Deterministic pseudo-random source (mulberry32). Same seed, same sequence,
 * every time, so the demo does not reshuffle itself between renders.
 */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random value in [min, max], rounded to 2dp. */
export function between(r: () => number, min: number, max: number): number {
  return Math.round((min + r() * (max - min)) * 100) / 100
}

export function pick<T>(r: () => number, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)]
}

/** True with probability p. */
export function chance(r: () => number, p: number): boolean {
  return r() < p
}
