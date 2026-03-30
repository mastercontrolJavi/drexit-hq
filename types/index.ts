export interface BudgetEntry {
  id: string
  date: string
  category: BudgetCategory
  description: string | null
  amount_gbp: number
  month_key: string
  created_at: string
}

export interface Goal {
  id: string
  title: string
  description: string | null
  category: GoalCategory
  deadline: string | null
  status: GoalStatus
  progress_pct: number
  notes: string | null
  created_at: string
}

export interface WeighIn {
  id: string
  date: string
  weight_lbs: number
  bmi: number | null
  body_fat_pct: number | null
  note: string | null
  created_at: string
}

export interface FoodItem {
  id: string
  name: string
  category: FoodCategory
  notes: string | null
  created_at: string
}

export interface BusinessIdea {
  id: string
  title: string
  description: string | null
  direction: IdeaDirection
  priority: IdeaPriority
  status: IdeaStatus
  next_action: string | null
  notes: string | null
  archived: boolean
  updated_at: string
  created_at: string
}

export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  created_at: string
}

export type SavingsTransactionType = 'manual' | 'budget_link'

export interface SavingsTransaction {
  id: string
  goal_id: string
  amount: number
  type: SavingsTransactionType
  note: string | null
  linked_entry_id: string | null
  date: string
  created_at: string
}

export interface AppSetting {
  key: string
  value: string
  updated_at: string
}

export interface TodoItem {
  id: string
  title: string
  completed: boolean
}

export type BudgetCategory =
  | 'Food'
  | 'Transport'
  | 'Travel'
  | 'Going Out'
  | 'Shopping'
  | 'Subscriptions'
  | 'Other'

export type GoalCategory = 'Life' | 'Career' | 'Fitness' | 'Business' | 'Creative'
export type GoalStatus = 'not_started' | 'in_progress' | 'done'
export type FoodCategory = 'Protein' | 'Carb' | 'Fat' | 'Veg' | 'Other'
export type IdeaDirection = 'SaaS' | 'AI Tools' | 'Content' | 'Digital Products'
export type IdeaPriority = 'high' | 'medium' | 'low'
export type IdeaStatus = 'idea' | 'researching' | 'building' | 'live'

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  'Food', 'Transport', 'Travel', 'Going Out', 'Shopping', 'Subscriptions', 'Other',
]

export const GOAL_CATEGORIES: GoalCategory[] = [
  'Life', 'Career', 'Fitness', 'Business', 'Creative',
]

export const FOOD_CATEGORIES: FoodCategory[] = [
  'Protein', 'Carb', 'Fat', 'Veg', 'Other',
]

export const IDEA_DIRECTIONS: IdeaDirection[] = [
  'SaaS', 'AI Tools', 'Content', 'Digital Products',
]

export const IDEA_STATUSES: IdeaStatus[] = [
  'idea', 'researching', 'building', 'live',
]

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  idea: 'Idea',
  researching: 'Researching',
  building: 'Building',
  live: 'Live',
}

export interface FixedExpense {
  name: string
  amount: number
}

export const FIXED_EXPENSES: FixedExpense[] = [
  { name: 'Groceries', amount: 220 },
  { name: 'Transportation', amount: 96 },
  { name: 'Subscriptions', amount: 96 },
  { name: 'Revolut Platinum', amount: 55 },
  { name: 'Phone bill', amount: 41 },
  { name: 'Travel pocket', amount: 150 },
  { name: 'US bank transfer', amount: 185 },
]

export const MONTHLY_INCOME = 1600
export const TOTAL_FIXED = FIXED_EXPENSES.reduce((sum, e) => sum + e.amount, 0)
export const DISCRETIONARY = MONTHLY_INCOME - TOTAL_FIXED

export const USER_STATS = {
  currentWeight: 215,
  goalWeight: 170,
  heightInches: 67, // 5'7"
  age: 24,
  sex: 'male' as const,
  activityLevel: 1.2, // sedentary
}

export const DREXIT_DATE = '2026-07-24'
export const WEIGHT_START_DATE = '2025-01-01'
