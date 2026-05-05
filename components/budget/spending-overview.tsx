'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { addDays, differenceInDays, format, parseISO, subMonths } from 'date-fns'
import { cn, formatCurrency, formatCurrencyShort, getMonthLabel } from '@/lib/utils'
import { BUDGET_CATEGORIES, type BudgetEntry } from '@/types'
import { useIncome } from '@/lib/hooks/use-income'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { UnderlineTabs, type UnderlineTabOption } from '@/components/data/underline-tabs'

const BILL_CATEGORIES = ['Rent', 'Subscriptions', 'Utilities']

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

interface MonoTooltipPayload {
  name?: string | number
  value?: number | string
  color?: string
  payload?: { name?: string }
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
          {p.color && <span style={{ background: p.color }} className="inline-block h-2 w-2" />}
          <span>£{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

type Period = 'this_month' | 'last_month' | 'custom' | string

function getMonthKeyForPeriod(period: Period): string {
  if (period === 'this_month') return format(new Date(), 'yyyy-MM')
  if (period === 'last_month') return format(subMonths(new Date(), 1), 'yyyy-MM')
  return period
}

function getPrevMonthKey(monthKey: string): string {
  return format(subMonths(parseISO(monthKey + '-01'), 1), 'yyyy-MM')
}

const PERIOD_TABS: UnderlineTabOption<Period>[] = [
  { value: 'this_month', label: 'THIS_MONTH' },
  { value: 'last_month', label: 'LAST_MONTH' },
  { value: 'custom',     label: 'CUSTOM' },
]

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

  const { currentEntries, prevEntries } = useMemo(() => {
    if (period === 'custom') {
      if (!customStart || !customEnd) return { currentEntries: [], prevEntries: [] }
      const curr = allEntries.filter((e) => e.date >= customStart && e.date <= customEnd)
      const duration = differenceInDays(parseISO(customEnd), parseISO(customStart))
      const prevEnd = format(addDays(parseISO(customStart), -1), 'yyyy-MM-dd')
      const prevStart = format(addDays(parseISO(customStart), -(duration + 1)), 'yyyy-MM-dd')
      const prev = allEntries.filter((e) => e.date >= prevStart && e.date <= prevEnd)
      return { currentEntries: curr, prevEntries: prev }
    }
    const mk = getMonthKeyForPeriod(period)
    const prevMk = getPrevMonthKey(mk)
    return {
      currentEntries: allEntries.filter((e) => e.month_key === mk),
      prevEntries: allEntries.filter((e) => e.month_key === prevMk),
    }
  }, [allEntries, period, customStart, customEnd])

  const filteredCurrent = useMemo(
    () => (includeBills ? currentEntries : currentEntries.filter((e) => !BILL_CATEGORIES.includes(e.category))),
    [currentEntries, includeBills],
  )
  const filteredPrev = useMemo(
    () => (includeBills ? prevEntries : prevEntries.filter((e) => !BILL_CATEGORIES.includes(e.category))),
    [prevEntries, includeBills],
  )

  const totalSpend = useMemo(
    () => filteredCurrent.reduce((s, e) => s + Number(e.amount_gbp), 0),
    [filteredCurrent],
  )
  const prevTotalSpend = useMemo(
    () => filteredPrev.reduce((s, e) => s + Number(e.amount_gbp), 0),
    [filteredPrev],
  )
  const changePct = prevTotalSpend > 0 ? ((totalSpend - prevTotalSpend) / prevTotalSpend) * 100 : 0

  const billsTotal = useMemo(
    () => currentEntries.filter((e) => BILL_CATEGORIES.includes(e.category)).reduce((s, e) => s + Number(e.amount_gbp), 0),
    [currentEntries],
  )
  const spendingTotal = useMemo(
    () => currentEntries.filter((e) => !BILL_CATEGORIES.includes(e.category)).reduce((s, e) => s + Number(e.amount_gbp), 0),
    [currentEntries],
  )
  const netTotal = income - billsTotal - spendingTotal

  const categoryBreakdown = useMemo(
    () =>
      BUDGET_CATEGORIES.map((cat) => {
        const curr = filteredCurrent
          .filter((e) => e.category === cat)
          .reduce((s, e) => s + Number(e.amount_gbp), 0)
        const prev = filteredPrev
          .filter((e) => e.category === cat)
          .reduce((s, e) => s + Number(e.amount_gbp), 0)
        const pct = totalSpend > 0 ? (curr / totalSpend) * 100 : 0
        const change = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0
        return { category: cat, amount: curr, pct, change, prevAmount: prev }
      })
        .filter((d) => d.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [filteredCurrent, filteredPrev, totalSpend],
  )

  const donutData = useMemo(
    () =>
      categoryBreakdown.map((d) => ({
        name: d.category,
        value: d.amount,
        fill: CATEGORY_FILL(d.category),
      })),
    [categoryBreakdown],
  )

  const months = useMemo(() => {
    const arr: string[] = []
    for (let i = 5; i >= 0; i--) arr.push(format(subMonths(new Date(), i), 'yyyy-MM'))
    return arr
  }, [])

  const monthlyBarData = useMemo(
    () =>
      months.map((m) => ({
        month: getMonthLabel(m).split(' ')[0].slice(0, 3),
        monthKey: m,
        amount: Math.round(
          allEntries.filter((e) => e.month_key === m).reduce((s, e) => s + Number(e.amount_gbp), 0),
        ),
      })),
    [allEntries, months],
  )

  const frequentMerchants = useMemo(() => {
    const groups: Record<string, { count: number; total: number }> = {}
    currentEntries.forEach((e) => {
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

  const largestPurchases = useMemo(
    () =>
      [...currentEntries]
        .sort((a, b) => Number(b.amount_gbp) - Number(a.amount_gbp))
        .slice(0, 3),
    [currentEntries],
  )

  const periodLabel =
    period === 'this_month' ? 'THIS MONTH'
    : period === 'last_month' ? 'LAST MONTH'
    : period === 'custom' ? 'CUSTOM'
    : getMonthLabel(period).toUpperCase()

  const activeMk = period !== 'custom' ? getMonthKeyForPeriod(period) : null

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-72 animate-pulse bg-bg-hover" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-44 animate-pulse bg-bg-hover" />
            <div className="h-72 animate-pulse bg-bg-hover" />
          </div>
          <div className="space-y-3">
            <div className="h-44 animate-pulse bg-bg-hover" />
            <div className="h-32 animate-pulse bg-bg-hover" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <UnderlineTabs<Period>
          options={PERIOD_TABS}
          value={period === 'this_month' || period === 'last_month' || period === 'custom' ? period : 'custom'}
          onChange={setPeriod}
        />
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border border-border bg-transparent px-2 py-1 font-mono text-[12px] tabular-nums text-text-1 focus:border-text-2 focus:outline-none"
            />
            <span className="caption text-text-3">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border border-border bg-transparent px-2 py-1 font-mono text-[12px] tabular-nums text-text-1 focus:border-text-2 focus:outline-none"
            />
          </div>
        )}
        <button
          onClick={() => setIncludeBills(!includeBills)}
          className={cn(
            'caption ml-auto border px-3 py-1.5 transition-colors',
            includeBills
              ? 'border-accent text-accent'
              : 'border-border text-text-3 hover:border-text-1 hover:text-text-1',
          )}
        >
          {includeBills ? '✓ ' : ''}INCLUDE BILLS
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: charts */}
        <div className="lg:col-span-2 space-y-4">
          {/* Monthly bar */}
          <section className="border border-border bg-bg-elevated">
            <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="caption text-text-2">MONTHLY SPEND · 6 MONTHS</span>
              <span className="caption text-text-3">CLICK TO FILTER</span>
            </header>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={monthlyBarData} barSize={28}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={tickStyle} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                  <YAxis
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `£${v}`}
                    width={42}
                  />
                  <Tooltip cursor={{ fill: 'var(--bg-hover)' }} content={<MonoTooltip />} />
                  <Bar
                    dataKey="amount"
                    cursor="pointer"
                    onClick={(_, index) => {
                      const mk = monthlyBarData[index]?.monthKey
                      if (mk) setPeriod(mk)
                    }}
                  >
                    {monthlyBarData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.monthKey === activeMk ? 'var(--accent)' : 'var(--text-3)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Donut + table */}
          <section className="border border-border bg-bg-elevated">
            <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="caption text-text-2">BREAKDOWN · {periodLabel}</span>
              {prevTotalSpend > 0 && (
                <span
                  className={cn(
                    'font-mono text-[11px] tabular-nums',
                    changePct > 0 ? 'text-danger' : changePct < 0 ? 'text-success' : 'text-text-3',
                  )}
                >
                  Δ {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
                </span>
              )}
            </header>

            {categoryBreakdown.length === 0 ? (
              <p className="font-mono text-xs text-text-3 px-4 py-12">&gt; no spending data for this period</p>
            ) : (
              <div className="flex flex-col gap-6 p-4 sm:flex-row">
                <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={92}
                        paddingAngle={1}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<MonoTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="num-display text-[24px] leading-none text-text-1">
                      {formatCurrencyShort(totalSpend)}
                    </p>
                    <p className="caption mt-1 text-text-3">TOTAL</p>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-[1fr_50px_70px_90px] gap-3 border-b border-border pb-1.5 caption text-text-3">
                    <span>CATEGORY</span>
                    <span className="text-right">%</span>
                    <span className="text-right">Δ PREV</span>
                    <span className="text-right">AMOUNT</span>
                  </div>
                  <div className="divide-y divide-border">
                    {categoryBreakdown.map((d) => (
                      <div
                        key={d.category}
                        className="grid grid-cols-[1fr_50px_70px_90px] items-center gap-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2 w-2 shrink-0"
                            style={{ background: CATEGORY_FILL(d.category) }}
                          />
                          <span className="truncate caption text-text-1">
                            {d.category.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-right font-mono text-[11px] tabular-nums text-text-3">
                          {d.pct.toFixed(0)}%
                        </span>
                        <span className="flex items-center justify-end gap-0.5">
                          {d.prevAmount > 0 ? (
                            <>
                              {d.change > 5 ? (
                                <ArrowUpRight className="h-3 w-3 text-danger" strokeWidth={1.5} />
                              ) : d.change < -5 ? (
                                <ArrowDownRight className="h-3 w-3 text-success" strokeWidth={1.5} />
                              ) : (
                                <Minus className="h-3 w-3 text-text-3" strokeWidth={1.5} />
                              )}
                              <span
                                className={cn(
                                  'font-mono text-[11px] tabular-nums',
                                  d.change > 5 ? 'text-danger' : d.change < -5 ? 'text-success' : 'text-text-3',
                                )}
                              >
                                {Math.abs(d.change).toFixed(0)}%
                              </span>
                            </>
                          ) : (
                            <span className="caption text-accent">NEW</span>
                          )}
                        </span>
                        <span className="text-right font-mono text-[12px] tabular-nums text-text-1">
                          {formatCurrency(d.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right: summary + lists */}
        <div className="space-y-4">
          <section className="border border-border bg-bg-elevated">
            <header className="border-b border-border px-4 py-2.5">
              <span className="caption text-text-2">SUMMARY</span>
            </header>
            <div className="space-y-2 p-4 font-mono text-[12px] tabular-nums">
              <div className="flex items-center justify-between">
                <span className="text-text-3">INCOME</span>
                <span className="text-success">+{formatCurrency(income)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-3">BILLS</span>
                <span className="text-warn">-{formatCurrency(billsTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-3">SPENDING</span>
                <span className="text-danger">-{formatCurrency(spendingTotal)}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
                <span className="caption text-text-2">NET</span>
                <span className={cn('text-[14px]', netTotal >= 0 ? 'text-success' : 'text-danger')}>
                  {formatCurrency(netTotal)}
                </span>
              </div>
            </div>
          </section>

          <section className="border border-border bg-bg-elevated">
            <header className="border-b border-border px-4 py-2.5">
              <span className="caption text-text-2">FREQUENT_SPEND</span>
            </header>
            <div className="p-4">
              {frequentMerchants.length === 0 ? (
                <p className="font-mono text-xs text-text-3">&gt; add descriptions to track merchants</p>
              ) : (
                <ul className="divide-y divide-border">
                  {frequentMerchants.map((m, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-text-1">{m.name}</p>
                        <p className="caption text-text-3">{m.count}× THIS PERIOD</p>
                      </div>
                      <div className="text-right shrink-0 font-mono text-[12px] tabular-nums">
                        <p className="text-text-1">{formatCurrencyShort(m.avg)}</p>
                        <p className="caption text-text-3">AVG</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="border border-border bg-bg-elevated">
            <header className="border-b border-border px-4 py-2.5">
              <span className="caption text-text-2">LARGEST_PURCHASES</span>
            </header>
            <div className="p-4">
              {largestPurchases.length === 0 ? (
                <p className="font-mono text-xs text-text-3">&gt; no transactions this period</p>
              ) : (
                <ul className="divide-y divide-border">
                  {largestPurchases.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-text-1">{e.description || e.category}</p>
                        <p className="caption text-text-3">
                          {format(parseISO(e.date), 'MMM d').toUpperCase()} · {e.category.toUpperCase()}
                        </p>
                      </div>
                      <p className="text-right font-mono text-[13px] tabular-nums text-danger">
                        {formatCurrency(Number(e.amount_gbp))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
