'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { differenceInDays, format, parseISO, subMonths } from 'date-fns'
import { cn, formatCurrency, getMonthLabel } from '@/lib/utils'
import type { BudgetEntry } from '@/types'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarClock, RefreshCcw } from 'lucide-react'

interface RecurringItem {
  name: string
  category: string
  avgAmount: number
  monthsDetected: number
  lastDate: string
  entries: BudgetEntry[]
  isActive: boolean
}

const tickStyle = {
  fontSize: 10,
  fill: 'var(--text-3)',
  fontFamily: 'var(--font-mono)',
}

interface MonoTooltipPayload {
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
      <div className="text-text-1">£{Number(payload[0].value).toFixed(0)}</div>
    </div>
  )
}

function detectRecurring(allEntries: BudgetEntry[]): RecurringItem[] {
  const withDesc = allEntries.filter((e) => (e.description || '').trim().length > 0)
  const groups: Record<string, BudgetEntry[]> = {}
  withDesc.forEach((e) => {
    const key = e.description!.trim().toLowerCase()
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  const twoMonthsAgo = format(subMonths(new Date(), 1), 'yyyy-MM')

  return Object.entries(groups)
    .filter(([, entries]) => {
      const months = new Set(entries.map((e) => e.month_key))
      if (months.size < 2) return false
      const amounts = entries.map((e) => Number(e.amount_gbp))
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
      const maxVariance = Math.max(...amounts.map((a) => Math.abs(a - avg) / avg))
      return maxVariance <= 0.3
    })
    .map(([, entries]) => {
      const amounts = entries.map((e) => Number(e.amount_gbp))
      const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length
      const distinctMonths = new Set(entries.map((e) => e.month_key))
      const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
      const lastEntry = sorted[0]
      const isActive = lastEntry.month_key >= twoMonthsAgo

      return {
        name: lastEntry.description || lastEntry.category,
        category: lastEntry.category,
        avgAmount,
        monthsDetected: distinctMonths.size,
        lastDate: lastEntry.date,
        entries,
        isActive,
      }
    })
    .sort((a, b) => b.avgAmount - a.avgAmount)
}

export function RecurringTracker() {
  const [allEntries, setAllEntries] = useState<BudgetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM')
    const { data } = await supabase
      .from('budget_entries')
      .select('*')
      .gte('month_key', sixMonthsAgo)
      .order('date', { ascending: true })
    setAllEntries((data as BudgetEntry[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const allRecurring = useMemo(() => detectRecurring(allEntries), [allEntries])
  const activeRecurring = allRecurring.filter((r) => r.isActive)
  const displayed = showInactive ? allRecurring : activeRecurring

  const monthlyTotal = activeRecurring.reduce((s, r) => s + r.avgAmount, 0)
  const yearlyTotal = monthlyTotal * 12

  const months = useMemo(() => {
    const arr: string[] = []
    for (let i = 5; i >= 0; i--) arr.push(format(subMonths(new Date(), i), 'yyyy-MM'))
    return arr
  }, [])

  const trendData = useMemo(() => {
    const recurringNames = new Set(allRecurring.map((r) => r.name.toLowerCase()))
    return months.map((m) => {
      const monthEntries = allEntries.filter(
        (e) => e.month_key === m && recurringNames.has((e.description || '').toLowerCase()),
      )
      const total = Math.round(monthEntries.reduce((s, e) => s + Number(e.amount_gbp), 0))
      return { month: getMonthLabel(m).split(' ')[0].slice(0, 3), total, monthKey: m }
    })
  }, [allEntries, allRecurring, months])

  const currentMonthKey = format(new Date(), 'yyyy-MM')

  function daysSince(dateStr: string): number {
    return differenceInDays(new Date(), parseISO(dateStr))
  }

  function estimatedNext(item: RecurringItem): string {
    const days = item.entries.map((e) => parseInt(e.date.split('-')[2]))
    const avgDay = Math.round(days.reduce((s, d) => s + d, 0) / days.length)
    const now = new Date()
    const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), avgDay)
    if (thisMonthDate > now) return format(thisMonthDate, 'MMM d')
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, avgDay)
    return format(nextMonthDate, 'MMM d')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse bg-bg-hover" />
        <div className="h-44 animate-pulse bg-bg-hover" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-bg-hover" />
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
          <span className="caption text-text-2">ACTIVE_RECURRING</span>
          <p className="num-display mt-1 text-[28px] leading-none text-text-1">
            {activeRecurring.length}
          </p>
        </div>
        <div className="px-5 py-4">
          <span className="caption text-text-2">/ MONTH</span>
          <p className="num-display mt-1 text-[28px] leading-none text-warn">
            {formatCurrency(monthlyTotal)}
          </p>
        </div>
        <div className="px-5 py-4">
          <span className="caption text-text-2">/ YEAR</span>
          <p className="num-display mt-1 text-[28px] leading-none text-danger">
            {formatCurrency(yearlyTotal)}
          </p>
        </div>
      </div>

      {/* Trend */}
      <section className="border border-border bg-bg-elevated">
        <header className="border-b border-border px-4 py-2.5">
          <span className="caption text-text-2">RECURRING SPEND · 6 MONTHS</span>
        </header>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={trendData} barSize={28}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={tickStyle} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} width={42} />
              <Tooltip cursor={{ fill: 'var(--bg-hover)' }} content={<MonoTooltip />} />
              <Bar dataKey="total">
                {trendData.map((entry, i) => (
                  <Cell key={i} fill={entry.monthKey === currentMonthKey ? 'var(--accent)' : 'var(--text-3)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* List header */}
      <div className="flex items-center justify-between">
        <span className="caption text-text-2">
          {showInactive ? 'ALL' : 'ACTIVE'} RECURRING · {displayed.length}
        </span>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={cn(
            'caption border px-3 py-1.5 transition-colors',
            showInactive
              ? 'border-accent text-accent'
              : 'border-border text-text-3 hover:border-text-1 hover:text-text-1',
          )}
        >
          {showInactive ? 'ACTIVE ONLY' : 'SHOW INACTIVE'}
        </button>
      </div>

      {displayed.length === 0 ? (
        <section className="border border-border bg-bg-elevated px-4 py-12 text-center">
          <CalendarClock className="mx-auto h-5 w-5 text-text-3" strokeWidth={1.5} />
          <p className="caption mt-3 text-text-2">NO RECURRING DETECTED</p>
          <p className="font-mono text-[11px] text-text-3 mt-2 mx-auto max-w-xs">
            &gt; auto-detected from descriptions appearing in 2+ months with ≤30% amount variance
          </p>
        </section>
      ) : (
        <ul className="space-y-2">
          {displayed.map((item, i) => (
            <li
              key={i}
              className={cn(
                'border border-border bg-bg-elevated p-3 transition-colors hover:bg-bg-hover',
                !item.isActive && 'opacity-60',
              )}
            >
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] text-text-1 truncate">{item.name}</p>
                    <span className="caption border border-border px-1.5 py-0.5 text-text-3">
                      {item.category.toUpperCase()}
                    </span>
                    {!item.isActive && <span className="caption text-text-3">· INACTIVE</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 caption text-text-3">
                    <span className="flex items-center gap-1">
                      <RefreshCcw className="h-2.5 w-2.5" strokeWidth={1.5} />
                      {item.monthsDetected}MO
                    </span>
                    <span>
                      LAST {format(parseISO(item.lastDate), 'MMM d').toUpperCase()} ({daysSince(item.lastDate)}D AGO)
                    </span>
                    {item.isActive && (
                      <span className="text-accent">NEXT ≈ {estimatedNext(item).toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono tabular-nums">
                  <p className="text-[14px] text-text-1">{formatCurrency(item.avgAmount)}</p>
                  <p className="caption text-text-3">{formatCurrency(item.avgAmount * 12)}/YR</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="caption text-center text-text-3">
        AUTO-DETECTED · 2+ MONTHS · 30% AMOUNT VARIANCE
      </p>
    </div>
  )
}
