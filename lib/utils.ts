import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInDays, format, getDaysInMonth, getDate } from "date-fns"
import { DREXIT_DATE, USER_STATS, WEIGHT_START_DATE } from "@/types"
import { DEMO_DREXIT_DATE, DEMO_WEIGHT_START_DATE, isDemoMode } from "./demo"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date Helpers ──

export function daysUntil(dateStr: string): number {
  return Math.max(0, differenceInDays(new Date(dateStr), new Date()))
}

/**
 * The departure date the app is counting down to. Demo mode substitutes a
 * rolling date so the public build never shows an expired countdown.
 */
export function drexitDate(): string {
  return isDemoMode ? DEMO_DREXIT_DATE : DREXIT_DATE
}

export function daysUntilDrexit(): number {
  return daysUntil(drexitDate())
}

/** Date the weight glide path is measured from. Demo mode tracks its fixtures. */
export function weightStartDate(): string {
  return isDemoMode ? DEMO_WEIGHT_START_DATE : WEIGHT_START_DATE
}

// Instantiated once, because these run inside list renders.
const DECIMAL = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const WHOLE = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Full precision with thousands grouping: £1,484.20 */
export function formatCurrency(amount: number, currency = '\u00A3'): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}${currency}${DECIMAL.format(Math.abs(amount))}`
}

/** Whole pounds with thousands grouping: £1,484 */
export function formatCurrencyShort(amount: number, currency = '\u00A3'): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}${currency}${WHOLE.format(Math.abs(amount))}`
}

/**
 * Abbreviated form for chart axes, where the gutter is ~48px and a grouped
 * four-digit figure would either clip or force the plot area narrower.
 * £980 · £2.4k · £14k · £1.2m
 */
export function formatAxisCurrency(amount: number, currency = '\u00A3'): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    return `${sign}${currency}${m >= 10 ? Math.round(m) : m.toFixed(1)}m`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    return `${sign}${currency}${k >= 10 ? Math.round(k) : k.toFixed(1)}k`
  }
  return `${sign}${currency}${Math.round(abs)}`
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), 'MMM d')
}

export function getCurrentMonthKey(): string {
  return format(new Date(), 'yyyy-MM')
}

export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy')
}

export function daysRemainingInMonth(): number {
  const now = new Date()
  return getDaysInMonth(now) - getDate(now)
}

export function daysElapsedInMonth(): number {
  return getDate(new Date())
}

// ── Fitness Calculations (Mifflin-St Jeor) ──

export function calculateBMR(
  weightLbs: number,
  heightInches: number,
  age: number,
  sex: 'male' | 'female'
): number {
  const weightKg = weightLbs * 0.453592
  const heightCm = heightInches * 2.54
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function calculateTDEE(bmr: number, activityMultiplier = 1.2): number {
  return Math.round(bmr * activityMultiplier)
}

export function calculateCutCalories(tdee: number, deficit = 750): number {
  return Math.round(tdee - deficit)
}

export function calculateMacros(calories: number, proteinGrams: number) {
  const fatCalories = Math.round(calories * 0.25)
  const fatGrams = Math.round(fatCalories / 9)
  const proteinCalories = proteinGrams * 4
  const carbCalories = calories - proteinCalories - fatCalories
  const carbGrams = Math.max(0, Math.round(carbCalories / 4))
  return { protein: proteinGrams, fat: fatGrams, carbs: carbGrams, calories }
}

export function getUserMacros() {
  const bmr = calculateBMR(
    USER_STATS.currentWeight,
    USER_STATS.heightInches,
    USER_STATS.age,
    USER_STATS.sex
  )
  const tdee = calculateTDEE(bmr, USER_STATS.activityLevel)
  const dailyCals = calculateCutCalories(tdee)
  return calculateMacros(dailyCals, USER_STATS.goalWeight) // 1g per lb of goal weight
}

// ── Weight Tracking ──

export function calculateTargetWeight(
  startWeight: number,
  goalWeight: number,
  startDate: string,
  endDate: string,
  currentDate: Date = new Date()
): number {
  const total = differenceInDays(new Date(endDate), new Date(startDate))
  const elapsed = differenceInDays(currentDate, new Date(startDate))
  const progress = Math.min(1, Math.max(0, elapsed / total))
  return Math.round((startWeight - (startWeight - goalWeight) * progress) * 10) / 10
}
