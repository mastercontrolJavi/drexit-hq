'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subMonths, getDaysInMonth, getDate } from 'date-fns'
import { formatCurrency, getCurrentMonthKey, getMonthLabel, cn } from '@/lib/utils'
import { BudgetEntry, BudgetLimit, BUDGET_CATEGORIES } from '@/types'
import { useIncome } from '@/lib/hooks/use-income'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Pencil,
  Check,
  X,
  RefreshCcw,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Helpers ────────────────────────────────────────────────────────────────

function getPaceColor(pct: number): string {
  if (pct >= 90) return 'text-ios-red'
  if (pct >= 70) return 'text-ios-orange'
  return 'text-ios-green'
}

function getBarColor(pct: number): string {
  if (pct >= 90) return '#FF3B30'
  if (pct >= 70) return '#FF9500'
  return '#34C759'
}

// ── Component ──────────────────────────────────────────────────────────────

export function BudgetLimits() {
  const { income } = useIncome()
  const [limits, setLimits] = useState<BudgetLimit[]>([])
  const [entries, setEntries] = useState<BudgetEntry[]>([])
  const [prevEntries, setPrevEntries] = useState<BudgetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [addCategory, setAddCategory] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const currentMonth = getCurrentMonthKey()
  const prevMonth = format(subMonths(new Date(), 1), 'yyyy-MM')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [limitsRes, entriesRes, prevRes] = await Promise.all([
      supabase.from('budget_limits').select('*').order('category'),
      supabase.from('budget_entries').select('*').eq('month_key', currentMonth),
      supabase.from('budget_entries').select('*').eq('month_key', prevMonth),
    ])
    setLimits((limitsRes.data as BudgetLimit[]) || [])
    setEntries((entriesRes.data as BudgetEntry[]) || [])
    setPrevEntries((prevRes.data as BudgetEntry[]) || [])
    setLoading(false)
  }, [currentMonth, prevMonth])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Per-category stats ─────────────────────────────────────────────────

  const daysElapsed = getDate(new Date())
  const daysInMonth = getDaysInMonth(new Date())
  const daysRemaining = daysInMonth - daysElapsed

  const categoryStats = useMemo(() => {
    return limits.map(lim => {
      const spent = entries
        .filter(e => e.category === lim.category)
        .reduce((s, e) => s + Number(e.amount_gbp), 0)
      const prevSpent = prevEntries
        .filter(e => e.category === lim.category)
        .reduce((s, e) => s + Number(e.amount_gbp), 0)

      const effectiveLimit = lim.monthly_limit + lim.carryover_amount
      const pct = effectiveLimit > 0 ? Math.min((spent / effectiveLimit) * 100, 100) : 0
      const dailyRate = daysElapsed > 0 ? spent / daysElapsed : 0
      const projected = Math.round(dailyRate * daysInMonth * 100) / 100
      const overBudget = effectiveLimit > 0 && projected > effectiveLimit
      const vsLastMonth = prevSpent > 0
        ? Math.round(((spent - prevSpent) / prevSpent) * 100)
        : null

      return {
        ...lim,
        spent,
        prevSpent,
        effectiveLimit,
        pct: Math.round(pct * 10) / 10,
        projected,
        overBudget,
        vsLastMonth,
      }
    })
  }, [limits, entries, prevEntries, daysElapsed, daysInMonth])

  // Categories that have limits set
  const usedCategories = new Set(limits.map(l => l.category))
  const availableCategories = BUDGET_CATEGORIES.filter(c => !usedCategories.has(c))

  // ── Mutations ──────────────────────────────────────────────────────────

  async function saveLimit(category: string, amount: number) {
    setSaving(true)
    const existing = limits.find(l => l.category === category)

    if (existing) {
      const { error } = await supabase
        .from('budget_limits')
        .update({ monthly_limit: amount, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) { toast.error('Failed to update limit'); setSaving(false); return }
      setLimits(prev => prev.map(l => l.category === category ? { ...l, monthly_limit: amount } : l))
    } else {
      const { data, error } = await supabase
        .from('budget_limits')
        .insert({ category, monthly_limit: amount, rollover: false, carryover_amount: 0 })
        .select()
        .single()
      if (error || !data) { toast.error('Failed to add limit'); setSaving(false); return }
      setLimits(prev => [...prev, data as BudgetLimit])
    }

    toast.success('Budget limit saved')
    setSaving(false)
    setEditingCategory(null)
  }

  async function toggleRollover(limitId: string, current: boolean) {
    const { error } = await supabase
      .from('budget_limits')
      .update({ rollover: !current, updated_at: new Date().toISOString() })
      .eq('id', limitId)
    if (error) { toast.error('Failed to update rollover'); return }
    setLimits(prev => prev.map(l => l.id === limitId ? { ...l, rollover: !current } : l))
  }

  async function removeLimit(limitId: string) {
    const { error } = await supabase.from('budget_limits').delete().eq('id', limitId)
    if (error) { toast.error('Failed to remove'); return }
    setLimits(prev => prev.filter(l => l.id !== limitId))
    toast.success('Budget limit removed')
  }

  async function applyRollover() {
    const rolloverLimits = limits.filter(l => l.rollover)
    if (rolloverLimits.length === 0) {
      toast('No categories have rollover enabled')
      return
    }

    let updated = 0
    for (const lim of rolloverLimits) {
      const prevSpent = prevEntries
        .filter(e => e.category === lim.category)
        .reduce((s, e) => s + Number(e.amount_gbp), 0)
      const unspent = Math.max(0, lim.monthly_limit - prevSpent)
      if (unspent <= 0) continue

      const { error } = await supabase
        .from('budget_limits')
        .update({
          carryover_amount: unspent,
          rollover_applied_month: currentMonth,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lim.id)
      if (!error) {
        setLimits(prev =>
          prev.map(l => l.id === lim.id ? { ...l, carryover_amount: unspent, rollover_applied_month: currentMonth } : l)
        )
        updated++
      }
    }

    toast.success(updated > 0
      ? `Rollover applied to ${updated} categor${updated === 1 ? 'y' : 'ies'}`
      : 'Nothing to roll over — all categories were over budget last month'
    )
  }

  async function handleAddLimit() {
    if (!addCategory || !addAmount) return
    const amount = parseFloat(addAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }
    await saveLimit(addCategory, amount)
    setAddCategory('')
    setAddAmount('')
  }

  // ── Total budget utilisation ───────────────────────────────────────────

  const totalBudgeted = limits.reduce((s, l) => s + l.monthly_limit + l.carryover_amount, 0)
  const totalSpent = categoryStats.reduce((s, c) => s + c.spent, 0)
  const hasRolloverReady = limits.some(l => l.rollover && l.rollover_applied_month !== currentMonth)

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header summary ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-card border-none">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Budgeted</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalBudgeted)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-none">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Spent</p>
            <p className={cn('text-2xl font-bold mt-1', totalSpent > totalBudgeted ? 'text-ios-red' : 'text-ios-orange')}>
              {formatCurrency(totalSpent)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-none">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Remaining</p>
            <p className={cn('text-2xl font-bold mt-1', totalBudgeted - totalSpent >= 0 ? 'text-ios-green' : 'text-ios-red')}>
              {formatCurrency(totalBudgeted - totalSpent)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Rollover banner ────────────────────────────────────────────── */}
      {hasRolloverReady && (
        <div className="flex items-center justify-between rounded-xl bg-ios-blue/8 border border-ios-blue/20 p-4">
          <div className="flex items-center gap-3">
            <RefreshCcw className="h-4 w-4 text-ios-blue shrink-0" />
            <div>
              <p className="text-sm font-medium text-ios-blue">Rollover available</p>
              <p className="text-xs text-muted-foreground">
                Some categories have rollover enabled — apply last month&apos;s unspent budget
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={applyRollover}
            className="text-ios-blue hover:bg-ios-blue/10 shrink-0"
          >
            Apply
          </Button>
        </div>
      )}

      {/* ── Category cards ─────────────────────────────────────────────── */}
      {categoryStats.length === 0 ? (
        <Card className="shadow-card border-none">
          <CardContent className="py-16 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No budget limits set yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add a category budget below to start tracking</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {categoryStats.map(cat => (
            <Card key={cat.category} className="shadow-card border-none">
              <CardContent className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">{cat.category}</p>
                    {cat.carryover_amount > 0 && (
                      <p className="text-xs text-ios-blue mt-0.5">
                        +{formatCurrency(cat.carryover_amount)} rollover
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {cat.vsLastMonth !== null && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] h-5',
                          cat.vsLastMonth > 0 ? 'border-ios-red/30 text-ios-red bg-ios-red/5'
                          : 'border-ios-green/30 text-ios-green bg-ios-green/5'
                        )}
                      >
                        {cat.vsLastMonth > 0 ? '+' : ''}{cat.vsLastMonth}% vs last
                      </Badge>
                    )}
                    <button
                      onClick={() => {
                        setEditingCategory(cat.category)
                        setEditValue(String(cat.monthly_limit))
                      }}
                      className="text-muted-foreground hover:text-ios-blue transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeLimit(cat.id)}
                      className="text-muted-foreground hover:text-ios-red transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Edit mode */}
                {editingCategory === cat.category ? (
                  <div className="flex gap-2 mb-3">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveLimit(cat.category, parseFloat(editValue))
                        if (e.key === 'Escape') setEditingCategory(null)
                      }}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-ios-green"
                      onClick={() => saveLimit(cat.category, parseFloat(editValue))}
                      disabled={saving}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditingCategory(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  /* Spent vs limit */
                  <div className="flex items-end justify-between mb-2">
                    <span className={cn('text-lg font-bold tabular-nums', getPaceColor(cat.pct))}>
                      {formatCurrency(cat.spent)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      / {formatCurrency(cat.effectiveLimit)}
                    </span>
                  </div>
                )}

                {/* Progress bar */}
                {editingCategory !== cat.category && (
                  <>
                    <div className="relative h-2 rounded-full bg-ios-gray-5 overflow-hidden mb-3">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(cat.pct, 100)}%`,
                          background: getBarColor(cat.pct),
                        }}
                      />
                    </div>

                    {/* Footer stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{cat.pct.toFixed(0)}% used</span>
                      <span>{daysRemaining}d left</span>
                    </div>

                    {/* Projected */}
                    <div className={cn(
                      'mt-2 rounded-lg px-2.5 py-1.5 text-xs',
                      cat.overBudget ? 'bg-ios-red/8 text-ios-red' : 'bg-ios-gray-6 text-muted-foreground'
                    )}>
                      Projected: {formatCurrency(cat.projected)} {cat.overBudget && '⚠︎ over budget'}
                    </div>
                  </>
                )}

                {/* Rollover toggle */}
                <button
                  onClick={() => toggleRollover(cat.id, cat.rollover)}
                  className={cn(
                    'mt-3 w-full rounded-lg py-1.5 text-xs font-medium transition-all',
                    cat.rollover
                      ? 'bg-ios-blue/8 text-ios-blue'
                      : 'bg-ios-gray-6 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {cat.rollover ? '↩ Rollover on' : 'Rollover off'}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Add new category budget ────────────────────────────────────── */}
      <Card className="shadow-card border-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-ios-blue" />
            Add Category Budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">All categories have limits set.</p>
          ) : (
            <div className="flex gap-3">
              <Select value={addCategory} onValueChange={v => setAddCategory(v ?? '')}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Category..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="1"
                min="0"
                value={addAmount}
                onChange={e => setAddAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddLimit()}
                placeholder="£ limit"
                className="w-28"
              />
              <Button
                onClick={handleAddLimit}
                disabled={!addCategory || !addAmount || saving}
                className="bg-ios-blue text-white hover:bg-ios-blue/90 shrink-0"
              >
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        {getMonthLabel(currentMonth)} · {daysRemaining} days remaining
      </p>
    </div>
  )
}
