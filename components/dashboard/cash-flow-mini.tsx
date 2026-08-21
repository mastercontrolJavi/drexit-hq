'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subMonths } from 'date-fns'
import { getMonthLabel, formatCurrencyShort } from '@/lib/utils'
import type { BudgetEntry } from '@/types'
import { useIncome } from '@/lib/hooks/use-income'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { LoadError } from '@/components/data/load-error'
import { CHART_ANIMATION } from '@/lib/motion'
import { SkeletonBarChart } from '@/components/data/skeleton'

interface MonthRow {
  month: string
  income: number
  expenses: number
  net: number
}

interface TooltipPayload {
  payload: MonthRow
}

function CashFlowTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0].payload
  return (
    <div className="border border-border-strong bg-bg-elevated px-2.5 py-1.5 font-mono text-[11px] tabular-nums">
      <div className="text-text-3">{p.month.toUpperCase()}</div>
      <div className="text-success">+{formatCurrencyShort(p.income)}</div>
      <div className="text-danger">-{formatCurrencyShort(p.expenses)}</div>
      <div className={p.net >= 0 ? 'text-text-1' : 'text-danger'}>
        NET {p.net >= 0 ? '+' : ''}{formatCurrencyShort(p.net)}
      </div>
    </div>
  )
}

export function CashFlowMini() {
  const { income } = useIncome()
  const [data, setData] = useState<MonthRow[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    const threeMonthsAgo = format(subMonths(new Date(), 2), 'yyyy-MM')
    const { data: entries, error } = await supabase
      .from('budget_entries')
      .select('amount_gbp, month_key')
      .gte('month_key', threeMonthsAgo)

    if (error) {
      setFailed(true)
      setLoading(false)
      return
    }

    const months: string[] = []
    for (let i = 2; i >= 0; i--) {
      months.push(format(subMonths(new Date(), i), 'yyyy-MM'))
    }

    const chartData: MonthRow[] = months.map((m) => {
      const spent = ((entries as BudgetEntry[]) || [])
        .filter((e) => e.month_key === m)
        .reduce((sum, e) => sum + Number(e.amount_gbp), 0)
      const expenses = Math.round(spent)
      return {
        month: getMonthLabel(m).split(' ')[0].slice(0, 3),
        income,
        expenses,
        net: income - expenses,
      }
    })

    setData(chartData)
    setLoading(false)
  }, [income])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const latestNet = data.length > 0 ? data[data.length - 1].net : 0

  return (
    <section className="border border-border bg-bg-elevated">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="caption text-text-2">CASH_FLOW</span>
        <span
          className={`font-mono text-[12px] tabular-nums ${latestNet >= 0 ? 'text-success' : 'text-danger'}`}
        >
          NET {latestNet >= 0 ? '+' : ''}{formatCurrencyShort(latestNet)}
        </span>
      </header>
      <div className="p-4">
        {loading ? (
          <SkeletonBarChart height={140} bars={6} />
        ) : failed ? (
          <LoadError onRetry={fetchData} className="h-[140px] items-start" />
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data} barGap={2}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'var(--bg-hover)' }} content={<CashFlowTooltip />} />
              <Bar {...CHART_ANIMATION} dataKey="income" fill="var(--success)" barSize={12} />
              <Bar {...CHART_ANIMATION} dataKey="expenses" fill="var(--danger)" barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
