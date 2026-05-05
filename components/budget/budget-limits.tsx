'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, getDate, getDaysInMonth, subMonths } from 'date-fns'
import { cn, formatCurrency, getCurrentMonthKey, getMonthLabel } from '@/lib/utils'
import { BUDGET_CATEGORIES, type BudgetEntry, type BudgetLimit } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Pencil, Plus, RefreshCcw, TrendingUp, X } from 'lucide-react'
import { toast } from 'sonner'
import { HairlineProgress } from '@/components/data/hairline-progress'

function getPaceTone(pct: number): 'success' | 'warn' | 'danger' {
  if (pct >= 90) return 'danger'
  if (pct >= 70) return 'warn'
  return 'success'
}

const TONE_TEXT = {
  success: 'text-success',
  warn: 'text-warn',
  danger: 'text-danger',
} as const

export function BudgetLimits() {
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

  const daysElapsed = getDate(new Date())
  const daysInMonth = getDaysInMonth(new Date())
  const daysRemaining = daysInMonth - daysElapsed

  const categoryStats = useMemo(() => {
    return limits.map((lim) => {
      const spent = entries
        .filter((e) => e.category === lim.category)
        .reduce((s, e) => s + Number(e.amount_gbp), 0)
      const prevSpent = prevEntries
        .filter((e) => e.category === lim.category)
        .reduce((s, e) => s + Number(e.amount_gbp), 0)

      const effectiveLimit = lim.monthly_limit + lim.carryover_amount
      const pct = effectiveLimit > 0 ? Math.min((spent / effectiveLimit) * 100, 100) : 0
      const dailyRate = daysElapsed > 0 ? spent / daysElapsed : 0
      const projected = Math.round(dailyRate * daysInMonth * 100) / 100
      const overBudget = effectiveLimit > 0 && projected > effectiveLimit
      const vsLastMonth = prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : null

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

  const usedCategories = new Set(limits.map((l) => l.category))
  const availableCategories = BUDGET_CATEGORIES.filter((c) => !usedCategories.has(c))

  async function saveLimit(category: string, amount: number) {
    setSaving(true)
    const existing = limits.find((l) => l.category === category)

    if (existing) {
      const { error } = await supabase
        .from('budget_limits')
        .update({ monthly_limit: amount, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) {
        toast.error('Failed to update limit')
        setSaving(false)
        return
      }
      setLimits((prev) =>
        prev.map((l) => (l.category === category ? { ...l, monthly_limit: amount } : l)),
      )
    } else {
      const { data, error } = await supabase
        .from('budget_limits')
        .insert({ category, monthly_limit: amount, rollover: false, carryover_amount: 0 })
        .select()
        .single()
      if (error || !data) {
        toast.error('Failed to add limit')
        setSaving(false)
        return
      }
      setLimits((prev) => [...prev, data as BudgetLimit])
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
    if (error) {
      toast.error('Failed to update rollover')
      return
    }
    setLimits((prev) =>
      prev.map((l) => (l.id === limitId ? { ...l, rollover: !current } : l)),
    )
  }

  async function removeLimit(limitId: string) {
    const { error } = await supabase.from('budget_limits').delete().eq('id', limitId)
    if (error) {
      toast.error('Failed to remove')
      return
    }
    setLimits((prev) => prev.filter((l) => l.id !== limitId))
    toast.success('Budget limit removed')
  }

  async function applyRollover() {
    const rolloverLimits = limits.filter((l) => l.rollover)
    if (rolloverLimits.length === 0) {
      toast('No categories have rollover enabled')
      return
    }

    let updated = 0
    for (const lim of rolloverLimits) {
      const prevSpent = prevEntries
        .filter((e) => e.category === lim.category)
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
        setLimits((prev) =>
          prev.map((l) =>
            l.id === lim.id
              ? { ...l, carryover_amount: unspent, rollover_applied_month: currentMonth }
              : l,
          ),
        )
        updated++
      }
    }

    toast.success(
      updated > 0
        ? `Rollover applied to ${updated} categor${updated === 1 ? 'y' : 'ies'}`
        : 'Nothing to roll over — all categories were over budget last month',
    )
  }

  async function handleAddLimit() {
    if (!addCategory || !addAmount) return
    const amount = parseFloat(addAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    await saveLimit(addCategory, amount)
    setAddCategory('')
    setAddAmount('')
  }

  const totalBudgeted = limits.reduce((s, l) => s + l.monthly_limit + l.carryover_amount, 0)
  const totalSpent = categoryStats.reduce((s, c) => s + c.spent, 0)
  const hasRolloverReady = limits.some(
    (l) => l.rollover && l.rollover_applied_month !== currentMonth,
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse bg-bg-hover" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse bg-bg-hover" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 border border-border bg-bg-elevated divide-x divide-border">
        <div className="px-5 py-4">
          <span className="caption text-text-2">BUDGETED</span>
          <p className="num-display mt-1 text-[28px] leading-none text-text-1">
            {formatCurrency(totalBudgeted)}
          </p>
        </div>
        <div className="px-5 py-4">
          <span className="caption text-text-2">SPENT</span>
          <p
            className={cn(
              'num-display mt-1 text-[28px] leading-none',
              totalSpent > totalBudgeted ? 'text-danger' : 'text-warn',
            )}
          >
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className="px-5 py-4">
          <span className="caption text-text-2">REMAINING</span>
          <p
            className={cn(
              'num-display mt-1 text-[28px] leading-none',
              totalBudgeted - totalSpent >= 0 ? 'text-success' : 'text-danger',
            )}
          >
            {formatCurrency(totalBudgeted - totalSpent)}
          </p>
        </div>
      </div>

      {/* Rollover banner */}
      {hasRolloverReady && (
        <div className="flex items-center justify-between border border-accent/40 bg-bg-elevated px-4 py-3">
          <div className="flex items-center gap-3">
            <RefreshCcw className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.5} />
            <p className="font-mono text-[12px] text-text-2">
              <span className="text-accent">ROLLOVER AVAILABLE</span> · apply unspent budget from {getMonthLabel(prevMonth).toUpperCase()}
            </p>
          </div>
          <button
            onClick={applyRollover}
            className="caption border border-accent px-3 py-1.5 text-accent hover:bg-accent hover:text-bg-base"
          >
            APPLY
          </button>
        </div>
      )}

      {/* Category cards */}
      {categoryStats.length === 0 ? (
        <section className="border border-border bg-bg-elevated px-4 py-12 text-center">
          <TrendingUp className="mx-auto h-5 w-5 text-text-3" strokeWidth={1.5} />
          <p className="caption mt-3 text-text-2">NO BUDGET LIMITS SET</p>
          <p className="caption mt-1 text-text-3">ADD A CATEGORY BUDGET BELOW</p>
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {categoryStats.map((cat) => (
            <section key={cat.category} className="border border-border bg-bg-elevated p-4">
              <header className="mb-3 flex items-start justify-between">
                <div>
                  <span className="caption text-text-1">{cat.category.toUpperCase()}</span>
                  {cat.carryover_amount > 0 && (
                    <p className="caption mt-0.5 text-accent">
                      +{formatCurrency(cat.carryover_amount)} ROLLOVER
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {cat.vsLastMonth !== null && (
                    <span
                      className={cn(
                        'caption border px-1.5 py-0.5',
                        cat.vsLastMonth > 0 ? 'border-danger/40 text-danger' : 'border-success/40 text-success',
                      )}
                    >
                      {cat.vsLastMonth > 0 ? '+' : ''}
                      {cat.vsLastMonth}% PREV
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setEditingCategory(cat.category)
                      setEditValue(String(cat.monthly_limit))
                    }}
                    className="text-text-3 transition-colors hover:text-text-1"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => removeLimit(cat.id)}
                    className="text-text-3 transition-colors hover:text-danger"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              </header>

              {editingCategory === cat.category ? (
                <div className="mb-3 flex items-center gap-2">
                  <input
                    autoFocus
                    type="number"
                    step="1"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveLimit(cat.category, parseFloat(editValue))
                      if (e.key === 'Escape') setEditingCategory(null)
                    }}
                    className="flex-1 border border-border bg-transparent px-2 py-1 font-mono text-[13px] tabular-nums text-text-1 focus:border-text-2 focus:outline-none"
                  />
                  <button
                    onClick={() => saveLimit(cat.category, parseFloat(editValue))}
                    disabled={saving}
                    className="text-success transition-colors hover:opacity-80"
                  >
                    <Check className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="text-text-3 transition-colors hover:text-text-1"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              ) : (
                <div className="mb-2 flex items-baseline justify-between">
                  <span
                    className={cn(
                      'num-display text-[20px] leading-none',
                      TONE_TEXT[getPaceTone(cat.pct)],
                    )}
                  >
                    {formatCurrency(cat.spent)}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-text-3">
                    / {formatCurrency(cat.effectiveLimit)}
                  </span>
                </div>
              )}

              {editingCategory !== cat.category && (
                <>
                  <HairlineProgress value={cat.pct} tone={getPaceTone(cat.pct)} height={2} className="mb-2" />
                  <div className="flex items-center justify-between caption text-text-3">
                    <span>{cat.pct.toFixed(0)}% USED</span>
                    <span>{daysRemaining}D LEFT</span>
                  </div>
                  <div
                    className={cn(
                      'mt-2 border px-2 py-1 caption',
                      cat.overBudget
                        ? 'border-danger/40 text-danger'
                        : 'border-border text-text-3',
                    )}
                  >
                    PROJECTED · {formatCurrency(cat.projected)}
                    {cat.overBudget && ' · OVER BUDGET'}
                  </div>
                </>
              )}

              <button
                onClick={() => toggleRollover(cat.id, cat.rollover)}
                className={cn(
                  'caption mt-3 block w-full border py-1.5 transition-colors',
                  cat.rollover
                    ? 'border-accent text-accent'
                    : 'border-border text-text-3 hover:border-text-1 hover:text-text-1',
                )}
              >
                {cat.rollover ? '↩ ROLLOVER ON' : 'ROLLOVER OFF'}
              </button>
            </section>
          ))}
        </div>
      )}

      {/* Add category */}
      <section className="border border-border bg-bg-elevated">
        <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Plus className="h-3 w-3 text-text-2" strokeWidth={1.5} />
          <span className="caption text-text-2">ADD CATEGORY BUDGET</span>
        </header>
        <div className="p-4">
          {availableCategories.length === 0 ? (
            <p className="font-mono text-xs text-text-3">&gt; all categories have limits set</p>
          ) : (
            <div className="flex gap-2">
              <Select value={addCategory} onValueChange={(v) => setAddCategory(v ?? '')}>
                <SelectTrigger className="h-8 flex-1 rounded-none border-border bg-transparent font-mono text-[13px]">
                  <SelectValue placeholder="select category..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="number"
                step="1"
                min="0"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLimit()}
                placeholder="£ limit"
                className="w-28 border border-border bg-transparent px-2 font-mono text-[13px] tabular-nums text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
              <button
                onClick={handleAddLimit}
                disabled={!addCategory || !addAmount || saving}
                className="caption border border-text-1 bg-text-1 px-3 py-1.5 text-bg-base disabled:opacity-50 hover:bg-bg-base hover:text-text-1 disabled:hover:bg-text-1 disabled:hover:text-bg-base"
              >
                ADD
              </button>
            </div>
          )}
        </div>
      </section>

      <p className="caption text-center text-text-3">
        {getMonthLabel(currentMonth).toUpperCase()} · {daysRemaining} DAYS REMAINING
      </p>
    </div>
  )
}
