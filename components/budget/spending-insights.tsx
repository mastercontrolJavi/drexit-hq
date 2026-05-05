'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, getDate, getDaysInMonth, subMonths } from 'date-fns'
import { cn, formatCurrency, formatCurrencyShort, getMonthLabel } from '@/lib/utils'
import type { BudgetEntry } from '@/types'
import { useIncome } from '@/lib/hooks/use-income'
import {
  BarChart3,
  CalendarDays,
  Flame,
  PiggyBank,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react'

type Tone = 'accent' | 'success' | 'warn' | 'danger' | 'neutral'

interface Insight {
  id: string
  Icon: LucideIcon
  label: string
  headline: string
  metric: string
  tone: Tone
}

const TONE_TEXT: Record<Tone, string> = {
  accent:  'text-accent',
  success: 'text-success',
  warn:    'text-warn',
  danger:  'text-danger',
  neutral: 'text-text-1',
}

const TONE_BORDER: Record<Tone, string> = {
  accent:  'border-accent/40',
  success: 'border-success/40',
  warn:    'border-warn/40',
  danger:  'border-danger/40',
  neutral: 'border-border',
}

export function SpendingInsights() {
  const { income } = useIncome()
  const [currentEntries, setCurrentEntries] = useState<BudgetEntry[]>([])
  const [prevEntries, setPrevEntries] = useState<BudgetEntry[]>([])
  const [loading, setLoading] = useState(true)

  const currentMonth = format(new Date(), 'yyyy-MM')
  const prevMonth = format(subMonths(new Date(), 1), 'yyyy-MM')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const [curr, prev] = await Promise.all([
      supabase.from('budget_entries').select('*').eq('month_key', currentMonth),
      supabase.from('budget_entries').select('*').eq('month_key', prevMonth),
    ])
    setCurrentEntries((curr.data as BudgetEntry[]) || [])
    setPrevEntries((prev.data as BudgetEntry[]) || [])
    setLoading(false)
  }, [currentMonth, prevMonth])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const insights = useMemo((): Insight[] => {
    if (currentEntries.length === 0) return []
    const result: Insight[] = []

    const totalCurr = currentEntries.reduce((s, e) => s + Number(e.amount_gbp), 0)
    const totalPrev = prevEntries.reduce((s, e) => s + Number(e.amount_gbp), 0)
    const daysElapsed = getDate(new Date())
    const daysInMonth = getDaysInMonth(new Date())
    const daysRemaining = daysInMonth - daysElapsed

    const categoryChanges = Array.from(new Set(currentEntries.map((e) => e.category))).map((cat) => {
      const curr = currentEntries.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0)
      const prev = prevEntries.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0)
      const changePct = prev > 0 ? ((curr - prev) / prev) * 100 : 100
      return { category: cat, curr, prev, changePct }
    }).filter((c) => c.prev > 0 && c.changePct > 10)
      .sort((a, b) => b.changePct - a.changePct)

    if (categoryChanges.length > 0) {
      const top = categoryChanges[0]
      result.push({
        id: 'category-surge',
        Icon: TrendingUp,
        label: 'CATEGORY_SURGE',
        headline: `${top.category} spending up this month`,
        metric: `+${top.changePct.toFixed(0)}% vs last month`,
        tone: 'danger',
      })
    }

    const decreases = Array.from(new Set([...currentEntries, ...prevEntries].map((e) => e.category))).map((cat) => {
      const curr = currentEntries.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0)
      const prev = prevEntries.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0)
      const changePct = prev > 0 ? ((curr - prev) / prev) * 100 : 0
      return { category: cat, curr, prev, changePct }
    }).filter((c) => c.prev > 0 && c.changePct < -15)
      .sort((a, b) => a.changePct - b.changePct)

    if (decreases.length > 0) {
      const top = decreases[0]
      result.push({
        id: 'category-drop',
        Icon: TrendingDown,
        label: 'NICE_CUT',
        headline: `${top.category} spend down vs last month`,
        metric: `${top.changePct.toFixed(0)}% — saved ${formatCurrency(top.prev - top.curr)}`,
        tone: 'success',
      })
    }

    const catTotals = Array.from(new Set(currentEntries.map((e) => e.category)))
      .map((cat) => ({
        cat,
        total: currentEntries.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0),
      }))
      .sort((a, b) => b.total - a.total)

    if (catTotals.length >= 3 && totalCurr > 0) {
      const top3Total = catTotals.slice(0, 3).reduce((s, c) => s + c.total, 0)
      const pct = Math.round((top3Total / totalCurr) * 100)
      result.push({
        id: 'top3-concentration',
        Icon: BarChart3,
        label: 'CONCENTRATION',
        headline: `Top 3: ${catTotals[0].cat}, ${catTotals[1].cat}, ${catTotals[2].cat}`,
        metric: `${pct}% of total spend`,
        tone: 'accent',
      })
    }

    const spendByDay: Record<string, number> = {}
    currentEntries.forEach((e) => {
      if (!spendByDay[e.date]) spendByDay[e.date] = 0
      spendByDay[e.date] += Number(e.amount_gbp)
    })
    const days = Object.entries(spendByDay).sort((a, b) => b[1] - a[1])
    if (days.length > 0) {
      const [topDay, topDayAmount] = days[0]
      const txCount = currentEntries.filter((e) => e.date === topDay).length
      result.push({
        id: 'highest-day',
        Icon: Flame,
        label: 'BIG_SPEND_DAY',
        headline: `${format(new Date(topDay + 'T12:00:00'), 'EEEE, MMM d')} — ${txCount} txn${txCount !== 1 ? 's' : ''}`,
        metric: formatCurrency(topDayAmount),
        tone: 'warn',
      })
    }

    const merchantFreq: Record<string, number> = {}
    currentEntries.forEach((e) => {
      const key = (e.description || '').trim()
      if (!key) return
      merchantFreq[key] = (merchantFreq[key] || 0) + 1
    })
    const topMerchant = Object.entries(merchantFreq).sort((a, b) => b[1] - a[1])[0]
    if (topMerchant && topMerchant[1] >= 2) {
      const merchantSpend = currentEntries
        .filter((e) => (e.description || '').trim() === topMerchant[0])
        .reduce((s, e) => s + Number(e.amount_gbp), 0)
      result.push({
        id: 'top-merchant',
        Icon: ShoppingBag,
        label: 'MOST_FREQUENT',
        headline: `${topMerchant[0]} — ${topMerchant[1]}× this month`,
        metric: `Total: ${formatCurrency(merchantSpend)}`,
        tone: 'accent',
      })
    }

    const dailyRate = daysElapsed > 0 ? totalCurr / daysElapsed : 0
    const projected = dailyRate * daysInMonth
    const daysOfBudgetLeft = dailyRate > 0 ? Math.floor((income - totalCurr) / dailyRate) : daysRemaining

    if (projected > income * 0.9) {
      result.push({
        id: 'budget-pace',
        Icon: CalendarDays,
        label: 'BUDGET_PACE',
        headline: projected > income
          ? `On track to overspend by ${formatCurrencyShort(projected - income)}`
          : `Projected to use ${Math.round((projected / income) * 100)}% of budget`,
        metric: daysOfBudgetLeft > 0
          ? `~${daysOfBudgetLeft} days of budget left`
          : 'Budget nearly exhausted',
        tone: projected > income ? 'danger' : 'warn',
      })
    } else if (daysRemaining > 0 && totalCurr > 0) {
      result.push({
        id: 'budget-pace',
        Icon: Zap,
        label: 'ON_TRACK',
        headline: 'Spending well within budget this month',
        metric: `${formatCurrencyShort(income - projected)} headroom projected`,
        tone: 'success',
      })
    }

    if (totalPrev > 0 && totalCurr > 0 && daysElapsed >= 7) {
      const paceAdjustedCurr = (totalCurr / daysElapsed) * daysInMonth
      const trendPct = ((paceAdjustedCurr - totalPrev) / totalPrev) * 100
      if (Math.abs(trendPct) > 5) {
        result.push({
          id: 'monthly-trend',
          Icon: trendPct > 0 ? TrendingUp : TrendingDown,
          label: 'MONTHLY_TREND',
          headline: trendPct > 0
            ? 'Spending pace higher than last month'
            : 'Spending pace lower than last month',
          metric: `${trendPct > 0 ? '+' : ''}${trendPct.toFixed(0)}% pace vs ${getMonthLabel(prevMonth).split(' ')[0]}`,
          tone: trendPct > 0 ? 'warn' : 'success',
        })
      }
    }

    const remaining = income - totalCurr
    if (remaining > 100 && daysElapsed > 20) {
      result.push({
        id: 'savings-opp',
        Icon: PiggyBank,
        label: 'SAVINGS_OPP',
        headline: `${formatCurrencyShort(remaining)} left with ${daysRemaining} days to go`,
        metric: 'Transfer to savings before month end',
        tone: 'accent',
      })
    }

    return result
  }, [currentEntries, prevEntries, income, prevMonth])

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse bg-bg-hover" />
        ))}
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="border border-border bg-bg-elevated px-4 py-16 text-center">
        <Zap className="mx-auto h-5 w-5 text-text-3" strokeWidth={1.5} />
        <p className="caption mt-3 text-text-2">NO INSIGHTS YET</p>
        <p className="font-mono text-[11px] text-text-3 mt-1">
          &gt; add transactions this month to generate insights
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <span className="caption text-text-2">{format(new Date(), 'MMMM').toUpperCase()} · INSIGHTS</span>
        <p className="caption mt-0.5 text-text-3">DYNAMICALLY GENERATED FROM TRANSACTIONS</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => {
          const Icon = insight.Icon
          return (
            <section
              key={insight.id}
              className={cn(
                'border bg-bg-elevated p-4 transition-colors hover:bg-bg-hover',
                TONE_BORDER[insight.tone],
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn('h-3.5 w-3.5 shrink-0', TONE_TEXT[insight.tone])} strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <p className="caption text-text-3">{insight.label}</p>
                  <p className="mt-1 text-[13px] leading-snug text-text-1">
                    {insight.headline}
                  </p>
                  <p className={cn('mt-2 font-mono text-[12px] tabular-nums', TONE_TEXT[insight.tone])}>
                    {insight.metric}
                  </p>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
