'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subMonths, getDaysInMonth } from 'date-fns'
import { getMonthLabel } from '@/lib/utils'
import {
  BudgetEntry,
  SavingsGoal,
  SavingsTransaction,
  BUDGET_CATEGORIES,
  MONTHLY_INCOME,
  TOTAL_FIXED,
  DISCRETIONARY,
} from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  ReferenceLine,
  LineChart,
  Cell,
  Legend,
} from 'recharts'
import { BarChart3, TrendingUp, Calendar, Layers, PiggyBank, Scale } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#007AFF',
  Transport: '#5856D6',
  Travel: '#AF52DE',
  'Going Out': '#FF9500',
  Shopping: '#FF3B30',
  Subscriptions: '#34C759',
  Other: '#8E8E93',
}

const SAVINGS_COLORS = [
  '#007AFF', '#34C759', '#AF52DE', '#FF9500', '#FF3B30', '#5856D6',
]

const tooltipStyle = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: '13px',
}

interface BudgetAnalyticsProps {
  entries: BudgetEntry[]
  selectedMonth: string
  onCategoryClick?: (category: string) => void
  onMonthClick?: (monthKey: string) => void
}

export function BudgetAnalytics({
  entries,
  selectedMonth,
  onCategoryClick,
  onMonthClick,
}: BudgetAnalyticsProps) {
  const [allEntries, setAllEntries] = useState<BudgetEntry[]>([])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

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

  // Month keys for last 6 months
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    months.push(format(subMonths(new Date(), i), 'yyyy-MM'))
  }

  // ── Chart 1: Spending by Category (current month) ──
  const categoryData = BUDGET_CATEGORIES.map((cat) => {
    const total = entries
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + Number(e.amount_gbp), 0)
    return { category: cat, amount: Math.round(total * 100) / 100, fill: CATEGORY_COLORS[cat] }
  })
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  // ── Chart 2: Monthly Cash Flow (last 6 months) ──
  const cashFlowData = months.map((m) => {
    const monthEntries = allEntries.filter((e) => e.month_key === m)
    const spent = monthEntries.reduce((sum, e) => sum + Number(e.amount_gbp), 0)
    const totalExpenses = TOTAL_FIXED + spent
    const net = MONTHLY_INCOME - totalExpenses
    return {
      month: getMonthLabel(m).split(' ')[0],
      monthKey: m,
      income: MONTHLY_INCOME,
      expenses: Math.round(totalExpenses),
      net: Math.round(net),
    }
  })

  // ── Chart 3: Daily Spending Pace (current month) ──
  const [year, month] = selectedMonth.split('-').map(Number)
  const totalDays = getDaysInMonth(new Date(year, month - 1))
  const dailyBudget = DISCRETIONARY / totalDays

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

  // ── Chart 4: Category Trend (stacked bars across months) ──
  const categoryTrendData = months.map((m) => {
    const monthEntries = allEntries.filter((e) => e.month_key === m)
    const row: Record<string, number | string> = {
      month: getMonthLabel(m).split(' ')[0],
    }
    for (const cat of BUDGET_CATEGORIES) {
      row[cat] =
        Math.round(
          monthEntries
            .filter((e) => e.category === cat)
            .reduce((sum, e) => sum + Number(e.amount_gbp), 0) * 100
        ) / 100
    }
    return row
  })

  // ── Chart 5: Savings Growth (per goal over time) ──
  const savingsGrowthData = (() => {
    if (savingsGoals.length === 0 || savingsTransactions.length === 0) return []

    // Group transactions by date, compute running total per goal
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

  // ── Chart 6: Net Position (income - expenses - savings contributions) ──
  const netPositionData = months.map((m) => {
    const monthEntries = allEntries.filter((e) => e.month_key === m)
    const spent = monthEntries.reduce((sum, e) => sum + Number(e.amount_gbp), 0)
    const totalExpenses = TOTAL_FIXED + spent

    // Savings contributions for this month
    const monthStart = `${m}-01`
    const nextMonth = format(
      new Date(parseInt(m.split('-')[0]), parseInt(m.split('-')[1]), 1),
      'yyyy-MM-dd'
    )
    const savingsContributions = savingsTransactions
      .filter((t) => t.date >= monthStart && t.date < nextMonth && Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0)

    return {
      month: getMonthLabel(m).split(' ')[0],
      income: MONTHLY_INCOME,
      expenses: Math.round(totalExpenses),
      savings: Math.round(savingsContributions),
      net: Math.round(MONTHLY_INCOME - totalExpenses - savingsContributions),
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
    if (monthKey) {
      onMonthClick?.(monthKey)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Analytics</h3>
      <Tabs defaultValue="spending">
        <TabsList className="flex-wrap gap-1 bg-ios-gray-6 rounded-xl p-1">
          <TabsTrigger value="spending" className="rounded-lg text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Spending
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="rounded-lg text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Cash Flow
          </TabsTrigger>
          <TabsTrigger value="pace" className="rounded-lg text-xs">
            <Calendar className="h-3.5 w-3.5" /> Pace
          </TabsTrigger>
          <TabsTrigger value="trends" className="rounded-lg text-xs">
            <Layers className="h-3.5 w-3.5" /> Trends
          </TabsTrigger>
          <TabsTrigger value="savings" className="rounded-lg text-xs">
            <PiggyBank className="h-3.5 w-3.5" /> Savings
          </TabsTrigger>
          <TabsTrigger value="net" className="rounded-lg text-xs">
            <Scale className="h-3.5 w-3.5" /> Net
          </TabsTrigger>
        </TabsList>

        {/* Spending by Category */}
        <TabsContent value="spending" >
          <Card className="shadow-card border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-ios-blue" />
                Spending by Category — {getMonthLabel(selectedMonth)}
              </CardTitle>
              {activeCategory && (
                <p className="text-xs text-ios-blue">
                  Filtered: {activeCategory} · Click again to clear
                </p>
              )}
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No spending data</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `£${v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`£${Number(value).toFixed(2)}`, 'Spent']}
                    />
                    <Bar
                      dataKey="amount"
                      radius={[0, 6, 6, 0]}
                      barSize={24}
                      cursor="pointer"
                      onClick={(data) => handleCategoryBarClick(data as unknown as Record<string, unknown>)}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.fill}
                          opacity={activeCategory && activeCategory !== entry.category ? 0.3 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Cash Flow */}
        <TabsContent value="cashflow" >
          <Card className="shadow-card border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-ios-green" />
                Monthly Cash Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `£${v}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      `£${value}`,
                      name === 'net' ? 'Net Savings' : name === 'income' ? 'Income' : 'Expenses',
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="income"
                    fill="#34C759"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    name="Income"
                    cursor="pointer"
                    onClick={(_, index) => handleMonthBarClick(index)}
                  />
                  <Bar
                    dataKey="expenses"
                    fill="#FF3B30"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    name="Expenses"
                    cursor="pointer"
                    onClick={(_, index) => handleMonthBarClick(index)}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#007AFF"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#007AFF' }}
                    name="Net"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Spending Pace */}
        <TabsContent value="pace" >
          <Card className="shadow-card border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-ios-orange" />
                Daily Spending Pace — {getMonthLabel(selectedMonth)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={dailyPaceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `£${v}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      `£${Number(value).toFixed(2)}`,
                      name === 'cumulative' ? 'Actual' : 'Budget Pace',
                    ]}
                  />
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9500" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#FF9500" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#FF9500"
                    strokeWidth={2}
                    fill="url(#spendGradient)"
                    name="Actual"
                  />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#34C759"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    dot={false}
                    name="Budget Pace"
                  />
                  <ReferenceLine
                    y={DISCRETIONARY}
                    stroke="#FF3B30"
                    strokeDasharray="4 4"
                    label={{
                      value: `Budget £${DISCRETIONARY}`,
                      position: 'right',
                      fontSize: 10,
                      fill: '#FF3B30',
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category Trends */}
        <TabsContent value="trends" >
          <Card className="shadow-card border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-ios-purple" />
                Category Breakdown by Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={categoryTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `£${v}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`£${Number(value).toFixed(2)}`]}
                  />
                  <Legend />
                  {BUDGET_CATEGORIES.filter((cat) =>
                    categoryTrendData.some((d) => (d[cat] as number) > 0)
                  ).map((cat) => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat]} radius={0} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Savings Growth */}
        <TabsContent value="savings" >
          <Card className="shadow-card border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PiggyBank className="h-4 w-4 text-ios-green" />
                Savings Growth Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savingsGrowthData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No savings transactions yet — add deposits to see growth
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={savingsGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `£${v}`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [`£${Number(value).toFixed(2)}`, name]}
                    />
                    <Legend />
                    {savingsGoals.map((goal, i) => (
                      <Line
                        key={goal.id}
                        type="monotone"
                        dataKey={goal.name}
                        stroke={SAVINGS_COLORS[i % SAVINGS_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3, fill: SAVINGS_COLORS[i % SAVINGS_COLORS.length] }}
                      />
                    ))}
                    {/* Target reference lines */}
                    {savingsGoals.map((goal, i) => (
                      <ReferenceLine
                        key={`target-${goal.id}`}
                        y={Number(goal.target_amount)}
                        stroke={SAVINGS_COLORS[i % SAVINGS_COLORS.length]}
                        strokeDasharray="4 4"
                        strokeOpacity={0.4}
                        label={{
                          value: `${goal.name} target`,
                          position: 'right',
                          fontSize: 9,
                          fill: SAVINGS_COLORS[i % SAVINGS_COLORS.length],
                        }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Net Position */}
        <TabsContent value="net" >
          <Card className="shadow-card border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="h-4 w-4 text-ios-blue" />
                Net Position — Income vs Expenses vs Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={netPositionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `£${v}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        income: 'Income',
                        expenses: 'Expenses',
                        savings: 'Savings',
                        net: 'Net',
                      }
                      return [`£${value}`, labels[name as string] || name]
                    }}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#34C759" radius={[4, 4, 0, 0]} barSize={18} name="Income" />
                  <Bar dataKey="expenses" fill="#FF3B30" radius={[4, 4, 0, 0]} barSize={18} name="Expenses" />
                  <Bar dataKey="savings" fill="#AF52DE" radius={[4, 4, 0, 0]} barSize={18} name="Savings" />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#007AFF"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#007AFF' }}
                    name="Net"
                  />
                  <ReferenceLine y={0} stroke="#8E8E93" strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
