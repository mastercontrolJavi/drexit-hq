'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subMonths } from 'date-fns'
import { getMonthLabel, formatCurrencyShort } from '@/lib/utils'
import { BudgetEntry, MONTHLY_INCOME, TOTAL_FIXED } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

const tooltipStyle = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: '12px',
}

export function CashFlowMini() {
  const [data, setData] = useState<{ month: string; income: number; expenses: number }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const threeMonthsAgo = format(subMonths(new Date(), 2), 'yyyy-MM')
    const { data: entries } = await supabase
      .from('budget_entries')
      .select('amount_gbp, month_key')
      .gte('month_key', threeMonthsAgo)

    const months: string[] = []
    for (let i = 2; i >= 0; i--) {
      months.push(format(subMonths(new Date(), i), 'yyyy-MM'))
    }

    const chartData = months.map((m) => {
      const spent = ((entries as BudgetEntry[]) || [])
        .filter((e) => e.month_key === m)
        .reduce((sum, e) => sum + Number(e.amount_gbp), 0)
      return {
        month: getMonthLabel(m).split(' ')[0].slice(0, 3),
        income: MONTHLY_INCOME,
        expenses: Math.round(TOTAL_FIXED + spent),
      }
    })

    setData(chartData)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return <Skeleton className="h-[200px] rounded-xl" />
  }

  const latestNet = data.length > 0 ? data[data.length - 1].income - data[data.length - 1].expenses : 0

  return (
    <Card className="shadow-card border-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-ios-green" />
            Cash Flow
          </span>
          <span className={`text-lg font-bold ${latestNet >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
            {latestNet >= 0 ? '+' : ''}{formatCurrencyShort(latestNet)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={data} barGap={2}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [
                `£${value}`,
                name === 'income' ? 'Income' : 'Expenses',
              ]}
            />
            <Bar dataKey="income" fill="#34C759" radius={[3, 3, 0, 0]} barSize={14} />
            <Bar dataKey="expenses" fill="#FF3B30" radius={[3, 3, 0, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
