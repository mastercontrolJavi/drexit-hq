'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { MetricStrip, type MetricStripItem } from '@/components/data/metric-strip'
import { supabase } from '@/lib/supabase'
import {
  daysUntilDrexit,
  getCurrentMonthKey,
  formatCurrencyShort,
} from '@/lib/utils'
import { USER_STATS } from '@/types'
import type { BudgetEntry, WeighIn } from '@/types'
import { useIncome } from '@/lib/hooks/use-income'
import { format, subDays } from 'date-fns'

interface SeriesData {
  runway: number
  weeklyBurn: number[]
  weightSeries: number[]
  lbsToGoal: number
  openTodos: number
}

export function StatCards() {
  const { income } = useIncome()
  const [loading, setLoading] = useState(true)
  const [series, setSeries] = useState<SeriesData | null>(null)

  useEffect(() => {
    async function fetchStats() {
      const monthKey = getCurrentMonthKey()

      const [budgetRes, weighInRes, todoRes] = await Promise.all([
        supabase
          .from('budget_entries')
          .select('amount_gbp, date')
          .eq('month_key', monthKey),
        supabase
          .from('weigh_ins')
          .select('weight_lbs, date')
          .order('date', { ascending: true })
          .limit(8),
        supabase
          .from('todos')
          .select('id', { count: 'exact', head: true })
          .eq('completed', false),
      ])

      const entries =
        (budgetRes.data as Pick<BudgetEntry, 'amount_gbp' | 'date'>[] | null) ?? []
      const totalSpent = entries.reduce((sum, e) => sum + Number(e.amount_gbp), 0)

      // 4-week burn series (this month, week-by-week)
      const today = new Date()
      const weeklyBurn: number[] = []
      for (let w = 3; w >= 0; w--) {
        const weekStart = subDays(today, w * 7 + 6)
        const weekEnd = subDays(today, w * 7)
        const start = format(weekStart, 'yyyy-MM-dd')
        const end = format(weekEnd, 'yyyy-MM-dd')
        const sum = entries
          .filter((e) => e.date >= start && e.date <= end)
          .reduce((s, e) => s + Number(e.amount_gbp), 0)
        weeklyBurn.push(Math.round(sum))
      }

      const weighIns = (weighInRes.data as Pick<WeighIn, 'weight_lbs' | 'date'>[] | null) ?? []
      const weightSeries = weighIns.map((w) => Number(w.weight_lbs))
      const latestWeight =
        weightSeries.length > 0 ? weightSeries[weightSeries.length - 1] : USER_STATS.currentWeight

      setSeries({
        runway: income - totalSpent,
        weeklyBurn,
        weightSeries,
        lbsToGoal: Math.round(latestWeight - USER_STATS.goalWeight),
        openTodos: todoRes.count ?? 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [income])

  if (loading || !series) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-border bg-bg-elevated divide-x divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    )
  }

  const items: MetricStripItem[] = [
    {
      label: 'DREXIT_T',
      value: `T-${daysUntilDrexit()}`,
      delta: '24 JUL 26',
    },
    {
      label: 'RUNWAY',
      value: formatCurrencyShort(series.runway),
      tone: series.runway >= 0 ? 'success' : 'danger',
      spark: series.weeklyBurn,
      delta: `${series.weeklyBurn.length}W BURN`,
    },
    {
      label: 'TO_GOAL',
      value: `${series.lbsToGoal} LBS`,
      spark: series.weightSeries,
      delta: series.weightSeries.length > 1
        ? `Δ ${(series.weightSeries[series.weightSeries.length - 1] - series.weightSeries[0]).toFixed(1)}`
        : undefined,
    },
    {
      label: 'OPEN_TODOS',
      value: String(series.openTodos),
      delta: series.openTodos === 0 ? 'CLEAR' : 'PENDING',
      tone: series.openTodos === 0 ? 'success' : 'neutral',
    },
  ]

  return <MetricStrip items={items} />
}
