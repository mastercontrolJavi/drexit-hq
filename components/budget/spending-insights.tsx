'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subMonths, getDaysInMonth, getDate } from 'date-fns'
import { formatCurrency, formatCurrencyShort, getMonthLabel, cn } from '@/lib/utils'
import { BudgetEntry } from '@/types'
import { useIncome } from '@/lib/hooks/use-income'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  Flame,
  CalendarDays,
  ShoppingBag,
  Zap,
  PiggyBank,
  BarChart3,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface Insight {
  id: string
  icon: React.ReactNode
  label: string
  headline: string
  metric: string
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray'
}

// ── Color helpers ──────────────────────────────────────────────────────────

const colorMap = {
  blue: {
    bg: 'bg-ios-blue/8',
    icon: 'text-ios-blue',
    metric: 'text-ios-blue',
    border: 'border-ios-blue/10',
  },
  green: {
    bg: 'bg-ios-green/8',
    icon: 'text-ios-green',
    metric: 'text-ios-green',
    border: 'border-ios-green/10',
  },
  red: {
    bg: 'bg-ios-red/8',
    icon: 'text-ios-red',
    metric: 'text-ios-red',
    border: 'border-ios-red/10',
  },
  orange: {
    bg: 'bg-ios-orange/8',
    icon: 'text-ios-orange',
    metric: 'text-ios-orange',
    border: 'border-ios-orange/10',
  },
  purple: {
    bg: 'bg-[#AF52DE]/8',
    icon: 'text-[#AF52DE]',
    metric: 'text-[#AF52DE]',
    border: 'border-[#AF52DE]/10',
  },
  gray: {
    bg: 'bg-ios-gray-6',
    icon: 'text-muted-foreground',
    metric: 'text-foreground',
    border: 'border-ios-gray-4',
  },
}

// ── Component ──────────────────────────────────────────────────────────────

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

  // ── Compute insights ───────────────────────────────────────────────────

  const insights = useMemo((): Insight[] => {
    if (currentEntries.length === 0) return []
    const result: Insight[] = []

    const totalCurr = currentEntries.reduce((s, e) => s + Number(e.amount_gbp), 0)
    const totalPrev = prevEntries.reduce((s, e) => s + Number(e.amount_gbp), 0)
    const daysElapsed = getDate(new Date())
    const daysInMonth = getDaysInMonth(new Date())
    const daysRemaining = daysInMonth - daysElapsed

    // ── 1. Biggest category increase vs last month ─────────────────────
    const categoryChanges = [...new Set(currentEntries.map(e => e.category))].map(cat => {
      const curr = currentEntries.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0)
      const prev = prevEntries.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0)
      const changePct = prev > 0 ? ((curr - prev) / prev) * 100 : 100
      return { category: cat, curr, prev, changePct }
    }).filter(c => c.prev > 0 && c.changePct > 10)
      .sort((a, b) => b.changePct - a.changePct)

    if (categoryChanges.length > 0) {
      const top = categoryChanges[0]
      result.push({
        id: 'category-surge',
        icon: <TrendingUp className="h-4 w-4" />,
        label: 'Category Surge',
        headline: `${top.category} spending is up this month`,
        metric: `+${top.changePct.toFixed(0)}% vs last month`,
        color: 'red',
      })
    }

    // ── 2. Category decrease (good news) ──────────────────────────────
    const decreases = [...new Set([...currentEntries, ...prevEntries].map(e => e.category))].map(cat => {
      const curr = currentEntries.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0)
      const prev = prevEntries.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0)
      const changePct = prev > 0 ? ((curr - prev) / prev) * 100 : 0
      return { category: cat, curr, prev, changePct }
    }).filter(c => c.prev > 0 && c.changePct < -15)
      .sort((a, b) => a.changePct - b.changePct)

    if (decreases.length > 0) {
      const top = decreases[0]
      result.push({
        id: 'category-drop',
        icon: <TrendingDown className="h-4 w-4" />,
        label: 'Nice Cut',
        headline: `${top.category} spend is down vs last month`,
        metric: `${top.changePct.toFixed(0)}% — saved ${formatCurrency(top.prev - top.curr)}`,
        color: 'green',
      })
    }

    // ── 3. Top 3 categories = X% of total ─────────────────────────────
    const catTotals = [...new Set(currentEntries.map(e => e.category))]
      .map(cat => ({
        cat,
        total: currentEntries.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0),
      }))
      .sort((a, b) => b.total - a.total)

    if (catTotals.length >= 3 && totalCurr > 0) {
      const top3Total = catTotals.slice(0, 3).reduce((s, c) => s + c.total, 0)
      const pct = Math.round((top3Total / totalCurr) * 100)
      result.push({
        id: 'top3-concentration',
        icon: <BarChart3 className="h-4 w-4" />,
        label: 'Spend Concentration',
        headline: `Top 3 categories: ${catTotals[0].cat}, ${catTotals[1].cat}, ${catTotals[2].cat}`,
        metric: `${pct}% of total spend`,
        color: 'blue',
      })
    }

    // ── 4. Highest spend day ───────────────────────────────────────────
    const spendByDay: Record<string, number> = {}
    currentEntries.forEach(e => {
      if (!spendByDay[e.date]) spendByDay[e.date] = 0
      spendByDay[e.date] += Number(e.amount_gbp)
    })
    const days = Object.entries(spendByDay).sort((a, b) => b[1] - a[1])
    if (days.length > 0) {
      const [topDay, topDayAmount] = days[0]
      const txCount = currentEntries.filter(e => e.date === topDay).length
      result.push({
        id: 'highest-day',
        icon: <Flame className="h-4 w-4" />,
        label: 'Biggest Spend Day',
        headline: `${format(new Date(topDay + 'T12:00:00'), 'EEEE, MMM d')} — ${txCount} transaction${txCount !== 1 ? 's' : ''}`,
        metric: formatCurrency(topDayAmount),
        color: 'orange',
      })
    }

    // ── 5. Most frequent merchant ──────────────────────────────────────
    const merchantFreq: Record<string, number> = {}
    currentEntries.forEach(e => {
      const key = (e.description || '').trim()
      if (!key) return
      merchantFreq[key] = (merchantFreq[key] || 0) + 1
    })
    const topMerchant = Object.entries(merchantFreq).sort((a, b) => b[1] - a[1])[0]
    if (topMerchant && topMerchant[1] >= 2) {
      const merchantSpend = currentEntries
        .filter(e => (e.description || '').trim() === topMerchant[0])
        .reduce((s, e) => s + Number(e.amount_gbp), 0)
      result.push({
        id: 'top-merchant',
        icon: <ShoppingBag className="h-4 w-4" />,
        label: 'Most Frequent',
        headline: `${topMerchant[0]} — ${topMerchant[1]}× this month`,
        metric: `Total: ${formatCurrency(merchantSpend)}`,
        color: 'purple',
      })
    }

    // ── 6. Budget runway ──────────────────────────────────────────────
    const dailyRate = daysElapsed > 0 ? totalCurr / daysElapsed : 0
    const projected = dailyRate * daysInMonth
    const daysOfBudgetLeft = dailyRate > 0 ? Math.floor((income - totalCurr) / dailyRate) : daysRemaining

    if (projected > income * 0.9) {
      result.push({
        id: 'budget-pace',
        icon: <CalendarDays className="h-4 w-4" />,
        label: 'Budget Pace',
        headline: projected > income
          ? `On track to overspend by ${formatCurrencyShort(projected - income)}`
          : `Projected to use ${Math.round((projected / income) * 100)}% of budget`,
        metric: daysOfBudgetLeft > 0
          ? `~${daysOfBudgetLeft} days of budget left`
          : 'Budget nearly exhausted',
        color: projected > income ? 'red' : 'orange',
      })
    } else if (daysRemaining > 0 && totalCurr > 0) {
      result.push({
        id: 'budget-pace',
        icon: <Zap className="h-4 w-4" />,
        label: 'On Track',
        headline: `Spending well within budget this month`,
        metric: `${formatCurrencyShort(income - projected)} headroom projected`,
        color: 'green',
      })
    }

    // ── 7. Month-over-month trend ─────────────────────────────────────
    if (totalPrev > 0 && totalCurr > 0 && daysElapsed >= 7) {
      const paceAdjustedCurr = (totalCurr / daysElapsed) * daysInMonth
      const trendPct = ((paceAdjustedCurr - totalPrev) / totalPrev) * 100
      if (Math.abs(trendPct) > 5) {
        result.push({
          id: 'monthly-trend',
          icon: trendPct > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
          label: 'Monthly Trend',
          headline: trendPct > 0
            ? 'Spending pace is higher than last month'
            : 'Spending pace is lower than last month',
          metric: `${trendPct > 0 ? '+' : ''}${trendPct.toFixed(0)}% pace vs ${getMonthLabel(prevMonth).split(' ')[0]}`,
          color: trendPct > 0 ? 'orange' : 'green',
        })
      }
    }

    // ── 8. Savings opportunity ────────────────────────────────────────
    const remaining = income - totalCurr
    if (remaining > 100 && daysElapsed > 20) {
      result.push({
        id: 'savings-opp',
        icon: <PiggyBank className="h-4 w-4" />,
        label: 'Savings Opportunity',
        headline: `${formatCurrencyShort(remaining)} left with ${daysRemaining} days to go`,
        metric: `Transfer to savings before month end`,
        color: 'blue',
      })
    }

    return result
  }, [currentEntries, prevEntries, income, currentMonth, prevMonth])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-20">
        <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No insights yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add transactions this month to generate spending insights
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">
          {format(new Date(), 'MMMM')} Insights
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Dynamically generated from your real transaction data
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map(insight => {
          const colors = colorMap[insight.color]
          return (
            <Card
              key={insight.id}
              className={cn('shadow-card border', colors.border)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                    colors.bg,
                    colors.icon
                  )}>
                    {insight.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {insight.label}
                    </p>
                    <p className="text-sm leading-snug text-foreground">
                      {insight.headline}
                    </p>
                    <p className={cn('text-sm font-bold mt-1.5', colors.metric)}>
                      {insight.metric}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
