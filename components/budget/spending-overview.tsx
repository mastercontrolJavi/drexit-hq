'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subMonths, parseISO, differenceInDays, addDays } from 'date-fns'
import { formatCurrency, formatCurrencyShort, getMonthLabel, cn } from '@/lib/utils'
import { BudgetEntry, BUDGET_CATEGORIES } from '@/types'
import { useIncome } from '@/lib/hooks/use-income'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────

const BILL_CATEGORIES = ['Rent', 'Subscriptions', 'Utilities']

const CATEGORY_COLORS: Record<string, string> = {
  Restaurants: '#007AFF',
  Shopping: '#FF3B30',
  Groceries: '#34C759',
  Transportation: '#5856D6',
  Entertainment: '#FF9500',
  Travel: '#AF52DE',
  Health: '#FF2D55',
  Subscriptions: '#5AC8FA',
  Services: '#FFCC00',
  Utilities: '#8E8E93',
  Rent: '#FF6482',
  Cash: '#30B0C7',
  Transfer: '#A2845E',
}

const tooltipStyle = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: '13px',
}

type Period = 'this_month' | 'last_month' | 'custom' | string

// ── Helpers ────────────────────────────────────────────────────────────────

function getMonthKeyForPeriod(period: Period): string {
  if (period === 'this_month') return format(new Date(), 'yyyy-MM')
  if (period === 'last_month') return format(subMonths(new Date(), 1), 'yyyy-MM')
  return period // already a month key like '2026-01'
}

function getPrevMonthKey(monthKey: string): string {
  return format(subMonths(parseISO(monthKey + '-01'), 1), 'yyyy-MM')
}

// ── Component ──────────────────────────────────────────────────────────────

export function SpendingOverview() {
  const { income } = useIncome()
  const [allEntries, setAllEntries] = useState<BudgetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [includeBills, setIncludeBills] = useState(true)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM')
    const { data } = await supabase
      .from('budget_entries')
      .select('*')
      .gte('month_key', sixMonthsAgo)
      .order('date', { ascending: false })
    setAllEntries((data as BudgetEntry[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // ── Period filtering ───────────────────────────────────────────────────

  const { currentEntries, prevEntries } = useMemo(() => {
    if (period === 'custom') {
      if (!customStart || !customEnd) return { currentEntries: [], prevEntries: [] }
      const curr = allEntries.filter(e => e.date >= customStart && e.date <= customEnd)
      const duration = differenceInDays(parseISO(customEnd), parseISO(customStart))
      const prevEnd = format(addDays(parseISO(customStart), -1), 'yyyy-MM-dd')
      const prevStart = format(addDays(parseISO(customStart), -(duration + 1)), 'yyyy-MM-dd')
      const prev = allEntries.filter(e => e.date >= prevStart && e.date <= prevEnd)
      return { currentEntries: curr, prevEntries: prev }
    }
    const mk = getMonthKeyForPeriod(period)
    const prevMk = getPrevMonthKey(mk)
    return {
      currentEntries: allEntries.filter(e => e.month_key === mk),
      prevEntries: allEntries.filter(e => e.month_key === prevMk),
    }
  }, [allEntries, period, customStart, customEnd])

  // ── Filtered sets (respect includeBills toggle) ──────────────────────

  const filteredCurrent = useMemo(
    () => (includeBills ? currentEntries : currentEntries.filter(e => !BILL_CATEGORIES.includes(e.category))),
    [currentEntries, includeBills]
  )
  const filteredPrev = useMemo(
    () => (includeBills ? prevEntries : prevEntries.filter(e => !BILL_CATEGORIES.includes(e.category))),
    [prevEntries, includeBills]
  )

  // ── Totals ─────────────────────────────────────────────────────────────

  const totalSpend = useMemo(
    () => filteredCurrent.reduce((s, e) => s + Number(e.amount_gbp), 0),
    [filteredCurrent]
  )
  const prevTotalSpend = useMemo(
    () => filteredPrev.reduce((s, e) => s + Number(e.amount_gbp), 0),
    [filteredPrev]
  )
  const changePct = prevTotalSpend > 0 ? ((totalSpend - prevTotalSpend) / prevTotalSpend) * 100 : 0

  // Summary sidebar always uses unfiltered currentEntries
  const billsTotal = useMemo(
    () => currentEntries.filter(e => BILL_CATEGORIES.includes(e.category)).reduce((s, e) => s + Number(e.amount_gbp), 0),
    [currentEntries]
  )
  const spendingTotal = useMemo(
    () => currentEntries.filter(e => !BILL_CATEGORIES.includes(e.category)).reduce((s, e) => s + Number(e.amount_gbp), 0),
    [currentEntries]
  )
  const netTotal = income - billsTotal - spendingTotal

  // ── Category breakdown ─────────────────────────────────────────────────

  const categoryBreakdown = useMemo(() =>
    BUDGET_CATEGORIES
      .map(cat => {
        const curr = filteredCurrent.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0)
        const prev = filteredPrev.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount_gbp), 0)
        const pct = totalSpend > 0 ? (curr / totalSpend) * 100 : 0
        const change = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0
        return { category: cat, amount: curr, pct, change, prevAmount: prev }
      })
      .filter(d => d.amount > 0)
      .sort((a, b) => b.amount - a.amount),
    [filteredCurrent, filteredPrev, totalSpend]
  )

  const donutData = useMemo(() =>
    categoryBreakdown.map(d => ({
      name: d.category,
      value: d.amount,
      fill: CATEGORY_COLORS[d.category] || '#8E8E93',
    })),
    [categoryBreakdown]
  )

  // ── Monthly bar chart ──────────────────────────────────────────────────

  const months = useMemo(() => {
    const arr: string[] = []
    for (let i = 5; i >= 0; i--) arr.push(format(subMonths(new Date(), i), 'yyyy-MM'))
    return arr
  }, [])

  const monthlyBarData = useMemo(() =>
    months.map(m => ({
      month: getMonthLabel(m).split(' ')[0],
      monthKey: m,
      amount: Math.round(allEntries.filter(e => e.month_key === m).reduce((s, e) => s + Number(e.amount_gbp), 0)),
    })),
    [allEntries, months]
  )

  // ── Frequent merchants ─────────────────────────────────────────────────

  const frequentMerchants = useMemo(() => {
    const groups: Record<string, { count: number; total: number }> = {}
    currentEntries.forEach(e => {
      const key = (e.description || '').trim()
      if (!key) return
      if (!groups[key]) groups[key] = { count: 0, total: 0 }
      groups[key].count++
      groups[key].total += Number(e.amount_gbp)
    })
    return Object.entries(groups)
      .map(([name, { count, total }]) => ({ name, count, avg: total / count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }, [currentEntries])

  // ── Largest purchases ──────────────────────────────────────────────────

  const largestPurchases = useMemo(() =>
    [...currentEntries]
      .sort((a, b) => Number(b.amount_gbp) - Number(a.amount_gbp))
      .slice(0, 3),
    [currentEntries]
  )

  // ── Period label ───────────────────────────────────────────────────────

  const periodLabel =
    period === 'this_month' ? 'This Month'
    : period === 'last_month' ? 'Last Month'
    : period === 'custom' ? 'Custom'
    : getMonthLabel(period)

  const activeMk = period !== 'custom' ? getMonthKeyForPeriod(period) : null

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full max-w-sm" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Controls ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period toggle */}
        <div className="flex rounded-xl bg-ios-gray-6 p-1 gap-1">
          {(['this_month', 'last_month', 'custom'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200',
                period === p
                  ? 'bg-white shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p === 'this_month' ? 'This Month' : p === 'last_month' ? 'Last Month' : 'Custom'}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="w-36 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="w-36 h-8 text-sm"
            />
          </div>
        )}

        {/* Include Bills toggle */}
        <button
          onClick={() => setIncludeBills(!includeBills)}
          className={cn(
            'rounded-xl px-3 py-1.5 text-sm font-medium border transition-all duration-200',
            includeBills
              ? 'bg-ios-blue/10 text-ios-blue border-ios-blue/20'
              : 'bg-ios-gray-6 text-muted-foreground border-transparent hover:text-foreground'
          )}
        >
          {includeBills ? '✓ ' : ''}Include Bills
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left column (2/3) ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Monthly spend bar chart */}
          <Card className="shadow-card border-none">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
                Monthly Spend — Last 6 Months
              </p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={monthlyBarData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `£${v}`}
                    width={46}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={v => [`£${Number(v).toFixed(0)}`, 'Spent']}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
                  <Bar
                    dataKey="amount"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(data: { monthKey?: string }) => {
                      if (data?.monthKey) setPeriod(data.monthKey)
                    }}
                  >
                    {monthlyBarData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.monthKey === activeMk ? '#007AFF' : '#D1D1D6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Click a bar to filter to that month
              </p>
            </CardContent>
          </Card>

          {/* Donut + Category table */}
          <Card className="shadow-card border-none">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
                Spending Breakdown — {periodLabel}
              </p>

              {categoryBreakdown.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No spending data for this period
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* Donut chart */}
                  <div className="shrink-0 mx-auto sm:mx-0">
                    <div className="relative" style={{ width: 200, height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={62}
                            outerRadius={92}
                            paddingAngle={2}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {donutData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(v: number) => [`£${v.toFixed(2)}`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-[22px] font-bold leading-tight">
                          {formatCurrencyShort(totalSpend)}
                        </p>
                        {prevTotalSpend > 0 && (
                          <p className={cn(
                            'text-xs font-semibold',
                            changePct > 0 ? 'text-ios-red' : changePct < 0 ? 'text-ios-green' : 'text-muted-foreground'
                          )}>
                            {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">vs prev</p>
                      </div>
                    </div>
                  </div>

                  {/* Category table */}
                  <div className="flex-1 min-w-0 w-full">
                    {/* Header */}
                    <div className="grid grid-cols-4 gap-2 pb-2 border-b border-ios-gray-5">
                      <p className="text-xs font-medium text-muted-foreground">Category</p>
                      <p className="text-xs font-medium text-muted-foreground text-right">%</p>
                      <p className="text-xs font-medium text-muted-foreground text-right">vs prev</p>
                      <p className="text-xs font-medium text-muted-foreground text-right">Amount</p>
                    </div>
                    <div className="space-y-2.5 pt-2.5">
                      {categoryBreakdown.map(d => (
                        <div key={d.category} className="grid grid-cols-4 gap-2 items-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: CATEGORY_COLORS[d.category] || '#8E8E93' }}
                            />
                            <span className="text-xs truncate">{d.category}</span>
                          </div>
                          <span className="text-xs text-right text-muted-foreground">
                            {d.pct.toFixed(0)}%
                          </span>
                          <div className="flex items-center justify-end gap-0.5">
                            {d.prevAmount > 0 ? (
                              <>
                                {d.change > 5
                                  ? <ArrowUpRight className="h-3 w-3 text-ios-red shrink-0" />
                                  : d.change < -5
                                  ? <ArrowDownRight className="h-3 w-3 text-ios-green shrink-0" />
                                  : <Minus className="h-3 w-3 text-muted-foreground shrink-0" />}
                                <span className={cn(
                                  'text-xs',
                                  d.change > 5 ? 'text-ios-red'
                                  : d.change < -5 ? 'text-ios-green'
                                  : 'text-muted-foreground'
                                )}>
                                  {Math.abs(d.change).toFixed(0)}%
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">new</span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-right tabular-nums">
                            {formatCurrency(d.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar (1/3) ───────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Summary card */}
          <Card className="shadow-card border-none">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
                Summary
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-ios-green/10 flex items-center justify-center shrink-0">
                      <ArrowUpRight className="h-3.5 w-3.5 text-ios-green" />
                    </div>
                    <span className="text-sm">Income</span>
                  </div>
                  <span className="text-sm font-semibold text-ios-green tabular-nums">
                    +{formatCurrency(income)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-ios-orange/10 flex items-center justify-center shrink-0">
                      <ArrowDownRight className="h-3.5 w-3.5 text-ios-orange" />
                    </div>
                    <span className="text-sm">Bills</span>
                  </div>
                  <span className="text-sm font-semibold text-ios-orange tabular-nums">
                    -{formatCurrency(billsTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-ios-red/10 flex items-center justify-center shrink-0">
                      <ArrowDownRight className="h-3.5 w-3.5 text-ios-red" />
                    </div>
                    <span className="text-sm">Spending</span>
                  </div>
                  <span className="text-sm font-semibold text-ios-red tabular-nums">
                    -{formatCurrency(spendingTotal)}
                  </span>
                </div>
                <div className="h-px bg-ios-gray-5" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Net</span>
                  <span className={cn(
                    'text-sm font-bold tabular-nums',
                    netTotal >= 0 ? 'text-ios-green' : 'text-ios-red'
                  )}>
                    {formatCurrency(netTotal)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Frequent spend */}
          <Card className="shadow-card border-none">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
                Frequent Spend
              </p>
              {frequentMerchants.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Add descriptions to track merchants
                </p>
              ) : (
                <div className="space-y-3">
                  {frequentMerchants.map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.count}× this period</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrencyShort(m.avg)}
                        </p>
                        <p className="text-xs text-muted-foreground">avg</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Largest purchases */}
          <Card className="shadow-card border-none">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
                Largest Purchases
              </p>
              {largestPurchases.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No transactions this period</p>
              ) : (
                <div className="space-y-3">
                  {largestPurchases.map(e => (
                    <div key={e.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {e.description || e.category}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(e.date), 'MMM d')} · {e.category}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-ios-red shrink-0 tabular-nums">
                        {formatCurrency(Number(e.amount_gbp))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
