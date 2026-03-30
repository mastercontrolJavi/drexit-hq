import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInDays, format, getDaysInMonth, getDate } from "date-fns"
import { DREXIT_DATE, USER_STATS } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date Helpers ──

export function daysUntil(dateStr: string): number {
  return Math.max(0, differenceInDays(new Date(dateStr), new Date()))
}

export function daysUntilDrexit(): number {
  return daysUntil(DREXIT_DATE)
}

export function formatCurrency(amount: number, currency = '\u00A3'): string {
  return `${currency}${Math.abs(amount).toFixed(2)}`
}

export function formatCurrencyShort(amount: number, currency = '\u00A3'): string {
  return `${currency}${Math.abs(amount).toFixed(0)}`
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
