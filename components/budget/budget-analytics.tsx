'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, getDaysInMonth, subMonths } from 'date-fns'
import { getMonthLabel } from '@/lib/utils'
import {
  BUDGET_CATEGORIES,
  type BudgetEntry,
  type SavingsGoal,
  type SavingsTransaction,
} from '@/types'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { UnderlineTabs } from '@/components/data/underline-tabs'

// Restrained palette — one accent + monochromatic grays
const PALETTE = [
  'var(--accent)',
  'var(--text-1)',
  'var(--text-2)',
  'var(--text-3)',
  'var(--success)',
  'var(--warn)',
  'var(--danger)',
]

const CATEGORY_FILL = (cat: string): string => {
  const idx = BUDGET_CATEGORIES.indexOf(cat as (typeof BUDGET_CATEGORIES)[number])
  return PALETTE[idx % PALETTE.length]
}

const tickStyle = {
  fontSize: 10,
  fill: 'var(--text-3)',
  fontFamily: 'var(--font-mono)',
}

interface BudgetAnalyticsProps {
  entries: BudgetEntry[]
  selectedMonth: string
  income: number
  onCategoryClick?: (category: string) => void
  onMonthClick?: (monthKey: string) => void
}

interface MonoTooltipPayload {
  name?: string | number
  dataKey?: string | number
  value?: number | string
  color?: string
}

function MonoTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: MonoTooltipPayload[]
  label?: string | number
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="border border-border-strong bg-bg-elevated px-2.5 py-1.5 font-mono text-[11px] tabular-nums">
      {label !== undefined && <div className="caption text-text-3">{String(label).toUpperCase()}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-text-1">
          <span style={{ background: p.color }} className="inline-block h-2 w-2" />
          <span className="text-text-3">{String(p.name ?? p.dataKey).toUpperCase()}</span>
          <span>£{Number(p.value).toFixed(0)}</span>
        </div>
      ))}
    </div>
  )
}

type Tab = 'spending' | 'cashflow' | 'pace' | 'trends' | 'savings' | 'net'

const TABS: { value: Tab; label: string }[] = [
  { value: 'spending',  label: 'SPENDING' },
  { value: 'cashflow',  label: 'CASH_FLOW' },
  { value: 'pace',      label: 'PACE' },
  { value: 'trends',    label: 'TRENDS' },
  { value: 'savings',   label: 'SAVINGS' },
  { value: 'net',       label: 'NET' },
]

export function BudgetAnalytics({
  entries,
  selectedMonth,
  income,
  onCategoryClick,
  onMonthClick,
}: BudgetAnalyticsProps) {
  const [allEntries, setAllEntries] = useState<BudgetEntry[]>([])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('spending')

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    const sixMonthsAgo = format(subMonths(new Date(), 5), 'yyyy-MM')
    const [entriesRes, goalsRes, txRes] = await Promise.all([
      supabase
        .from('budget_entries')
        .select('*')
        .gte('month_key', sixMonthsAgo)
        .order('date', { ascending: true }),
      supabase.from('savings_goals').select('*').order('created_at', { ascending: true }),
      supabase
        .from('savings_transactions')
        .select('*')
        .order('date', { ascending: true }),
    ])
    setAllEntries((entriesRes.data as BudgetEntry[]) || [])
    setSavingsGoals((goalsRes.data as SavingsGoal[]) || [])
    setSavingsTransactions((txRes.data as SavingsTransaction[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    months.push(format(subMonths(new Date(), i), 'yyyy-MM'))
  }

  const categoryData = BUDGET_CATEGORIES.map((cat) => {
    const total = entries
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + Number(e.amount_gbp), 0)
    return { category: cat, amount: Math.round(total * 100) / 100, fill: CATEGORY_FILL(cat) }
  })
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const cashFlowData = months.map((m) => {
    const monthEntries = allEntries.filter((e) => e.month_key === m)
    const spent = monthEntries.reduce((sum, e) => sum + Number(e.amount_gbp), 0)
    const net = income - spent
    return {
      month: getMonthLabel(m).split(' ')[0].slice(0, 3),
      monthKey: m,
      income,
      expenses: Math.round(spent),
      net: Math.round(net),
    }
  })

  const [year, month] = selectedMonth.split('-').map(Number)
  const totalDays = getDaysInMonth(new Date(year, month - 1))
  const dailyBudget = income / totalDays
  const dailyPaceData: { day: number; cumulative: number; budget: number }[] = []
  let cumulative = 0
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`
    const daySpend = entries
      .filter((e) => e.date === dateStr)
      .reduce((sum, e) => sum + Number(e.amount_gbp), 0)
    cumulative += daySpend
    dailyPaceData.push({
      day: d,
      cumulative: Math.round(cumulative * 100) / 100,
      budget: Math.round(dailyBudget * d * 100) / 100,
    })
  }

  const categoryTrendData = months.map((m) => {
    const monthEntries = allEntries.filter((e) => e.month_key === m)
    const row: Record<string, number | string> = {
      month: getMonthLabel(m).split(' ')[0].slice(0, 3),
    }
    for (const cat of BUDGET_CATEGORIES) {
      row[cat] =
        Math.round(
          monthEntries
            .filter((e) => e.category === cat)
            .reduce((sum, e) => sum + Number(e.amount_gbp), 0) * 100,
        ) / 100
    }
    return row
  })

  const savingsGrowthData = (() => {
    if (savingsGoals.length === 0 || savingsTransactions.length === 0) return []
    const dateSet = new Set(savingsTransactions.map((t) => t.date))
    const sortedDates = Array.from(dateSet).sort()
    const runningTotals: Record<string, number> = {}
    savingsGoals.forEach((g) => (runningTotals[g.id] = 0))
    return sortedDates.map((date) => {
      const dayTx = savingsTransactions.filter((t) => t.date === date)
      dayTx.forEach((tx) => {
        if (runningTotals[tx.goal_id] !== undefined) {
          runningTotals[tx.goal_id] += Number(tx.amount)
        }
      })
      const point: Record<string, number | string> = {
        date: format(new Date(date), 'MMM d'),
      }
      savingsGoals.forEach((g) => {
        point[g.name] = Math.round((runningTotals[g.id] || 0) * 100) / 100
      })
      return point
    })
  })()

  const netPositionData = months.map((m) => {
    const monthEntries = allEntries.filter((e) => e.month_key === m)
    const spent = monthEntries.reduce((sum, e) => sum + Number(e.amount_gbp), 0)
    const monthStart = `${m}-01`
    const nextMonth = format(
      new Date(parseInt(m.split('-')[0]), parseInt(m.split('-')[1]), 1),
      'yyyy-MM-dd',
    )
    const savingsContributions = savingsTransactions
      .filter((t) => t.date >= monthStart && t.date < nextMonth && Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0)
    return {
      month: getMonthLabel(m).split(' ')[0].slice(0, 3),
      income,
      expenses: Math.round(spent),
      savings: Math.round(savingsContributions),
      net: Math.round(income - spent - savingsContributions),
    }
  })

  function handleCategoryBarClick(data: Record<string, unknown>) {
    const category = data.category as string | undefined
    if (category) {
      setActiveCategory(activeCategory === category ? null : category)
      onCategoryClick?.(category)
    }
  }

  function handleMonthBarClick(index: number) {
    const monthKey = cashFlowData[index]?.monthKey
    if (monthKey) onMonthClick?.(monthKey)
  }

  if (loading) {
    return (
      <section className="border border-border bg-bg-elevated">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="caption text-text-2">ANALYTICS</span>
        </header>
        <div className="h-[420px] animate-pulse bg-bg-hover" />
      </section>
    )
  }

  return (
    <section className="border border-border bg-bg-elevated">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="caption text-text-2">ANALYTICS</span>
      </header>

      <div className="px-4 pt-3">
        <UnderlineTabs<Tab> options={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="p-4">
        {tab === 'spending' && (
          <>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="caption text-text-2">
                BY CATEGORY · {getMonthLabel(selectedMonth).toUpperCase()}
              </span>
              {activeCategory && (
                <span className="caption text-accent">
                  FILTER · {activeCategory.toUpperCase()} · CLICK TO CLEAR
                </span>
              )}
            </div>
            {categoryData.length === 0 ? (
              <p className="font-mono text-xs text-text-3 py-8">&gt; no spending data</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, categoryData.length * 28 + 40)}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickFormatter={(v) => `£${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    tickFormatter={(v) => String(v).toUpperCase()}
                  />
                  <Tooltip cursor={{ fill: 'var(--bg-hover)' }} content={<MonoTooltip />} />
                  <Bar
                    dataKey="amount"
                    barSize={18}
                    cursor="pointer"
                    onClick={(data) => handleCategoryBarClick(data as unknown as Record<string, unknown>)}
                  >
                    {categoryData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.fill}
                        opacity={activeCategory && activeCategory !== entry.category ? 0.3 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </>
        )}

        {tab === 'cashflow' && (
          <>
            <span className="caption text-text-2">MONTHLY · INCOME vs EXPENSES</span>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={cashFlowData} margin={{ top: 16, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis dataKey="month" tick={tickStyle} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} width={48} />
                <Tooltip cursor={{ fill: 'var(--bg-hover)' }} content={<MonoTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-3)' }} />
                <Bar
                  dataKey="income"
                  fill="var(--success)"
                  barSize={16}
                  name="Income"
                  cursor="pointer"
                  onClick={(_, index) => handleMonthBarClick(index)}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--danger)"
                  barSize={16}
                  name="Expenses"
                  cursor="pointer"
                  onClick={(_, index) => handleMonthBarClick(index)}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: 'var(--accent)' }}
                  name="Net"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}

        {tab === 'pace' && (
          <>
            <span className="caption text-text-2">DAILY PACE · {getMonthLabel(selectedMonth).toUpperCase()}</span>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyPaceData} margin={{ top: 16, right: 24, bottom: 4, left: 4 }}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis dataKey="day" tick={tickStyle} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} width={48} />
                <Tooltip cursor={{ stroke: 'var(--border-strong)' }} content={<MonoTooltip />} />
                <defs>
                  <linearGradient id="paceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--warn)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--warn)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--warn)"
                  strokeWidth={1.5}
                  fill="url(#paceGradient)"
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  stroke="var(--success)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  name="Budget"
                />
                <ReferenceLine
                  y={income}
                  stroke="var(--danger)"
                  strokeDasharray="3 3"
                  label={{
                    value: `BUDGET £${income}`,
                    position: 'right',
                    fontSize: 10,
                    fill: 'var(--danger)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}

        {tab === 'trends' && (
          <>
            <span className="caption text-text-2">CATEGORY · 6 MONTHS</span>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryTrendData} margin={{ top: 16, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis dataKey="month" tick={tickStyle} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} width={48} />
                <Tooltip cursor={{ fill: 'var(--bg-hover)' }} content={<MonoTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-3)' }} />
                {BUDGET_CATEGORIES.filter((cat) =>
                  categoryTrendData.some((d) => (d[cat] as number) > 0),
                ).map((cat) => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_FILL(cat)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {tab === 'savings' && (
          <>
            <span className="caption text-text-2">SAVINGS GROWTH</span>
            {savingsGrowthData.length === 0 ? (
              <p className="font-mono text-xs text-text-3 py-8">&gt; no savings transactions yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={savingsGrowthData} margin={{ top: 16, right: 24, bottom: 4, left: 4 }}>
                  <CartesianGrid stroke="var(--border)" />
                  <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                  <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} width={48} />
                  <Tooltip cursor={{ stroke: 'var(--border-strong)' }} content={<MonoTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-3)' }} />
                  {savingsGoals.map((goal, i) => (
                    <Line
                      key={goal.id}
                      type="monotone"
                      dataKey={goal.name}
                      stroke={PALETTE[i % PALETTE.length]}
                      strokeWidth={1.5}
                      dot={{ r: 2, fill: PALETTE[i % PALETTE.length] }}
                    />
                  ))}
                  {savingsGoals.map((goal, i) => (
                    <ReferenceLine
                      key={`target-${goal.id}`}
                      y={Number(goal.target_amount)}
                      stroke={PALETTE[i % PALETTE.length]}
                      strokeDasharray="3 3"
                      strokeOpacity={0.4}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}

        {tab === 'net' && (
          <>
            <span className="caption text-text-2">NET POSITION</span>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={netPositionData} margin={{ top: 16, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis dataKey="month" tick={tickStyle} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} width={48} />
                <Tooltip cursor={{ fill: 'var(--bg-hover)' }} content={<MonoTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-3)' }} />
                <Bar dataKey="income"   fill="var(--success)" barSize={14} name="Income" />
                <Bar dataKey="expenses" fill="var(--danger)"  barSize={14} name="Expenses" />
                <Bar dataKey="savings"  fill="var(--accent)"  barSize={14} name="Savings" />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="var(--text-1)"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: 'var(--text-1)' }}
                  name="Net"
                />
                <ReferenceLine y={0} stroke="var(--text-3)" strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </section>
  )
}
