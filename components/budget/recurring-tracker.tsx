'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subMonths, parseISO, differenceInDays } from 'date-fns'
import { formatCurrency, getMonthLabel, cn } from '@/lib/utils'
import { BudgetEntry } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { RefreshCcw, CalendarClock, TrendingUp } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface RecurringItem {
  name: string
  category: string
  avgAmount: number
  monthsDetected: number
  lastDate: string
  entries: BudgetEntry[]
  isActive: boolean // appeared in last 2 months
}

// ── Constants ──────────────────────────────────────────────────────────────

const tooltipStyle = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: '13px',
}

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

// ── Auto-detection algorithm ───────────────────────────────────────────────

function detectRecurring(allEntries: BudgetEntry[]): RecurringItem[] {
  // Only entries with descriptions (merchant names) are candidates
  const withDesc = allEntries.filter(e => (e.description || '').trim().length > 0)

  // Group by normalised description
  const groups: Record<string, BudgetEntry[]> = {}
  withDesc.forEach(e => {
    const key = e.description!.trim().toLowerCase()
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  const twoMonthsAgo = format(subMonths(new Date(), 1), 'yyyy-MM')

  return Object.entries(groups)
    .filter(([, entries]) => {
      // Must span 2+ distinct months
      const months = new Set(entries.map(e => e.month_key))
      if (months.size < 2) return false

      // Amount variance ≤ 30%
      const amounts = entries.map(e => Number(e.amount_gbp))
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
      const maxVariance = Math.max(...amounts.map(a => Math.abs(a - avg) / avg))
      if (maxVariance > 0.3) return false

      return true
    })
    .map(([, entries]) => {
      const amounts = entries.map(e => Number(e.amount_gbp))
      const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length
      const distinctMonths = new Set(entries.map(e => e.month_key))
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

// ── Component ──────────────────────────────────────────────────────────────

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

  // ── Detected recurring items ───────────────────────────────────────────

  const allRecurring = useMemo(() => detectRecurring(allEntries), [allEntries])
  const activeRecurring = allRecurring.filter(r => r.isActive)
  const displayed = showInactive ? allRecurring : activeRecurring

  // ── Totals ─────────────────────────────────────────────────────────────

  const monthlyTotal = activeRecurring.reduce((s, r) => s + r.avgAmount, 0)
  const yearlyTotal = monthlyTotal * 12

  // ── Monthly recurring trend ────────────────────────────────────────────

  const months = useMemo(() => {
    const arr: string[] = []
    for (let i = 5; i >= 0; i--) arr.push(format(subMonths(new Date(), i), 'yyyy-MM'))
    return arr
  }, [])

  const trendData = useMemo(() => {
    const recurringNames = new Set(allRecurring.map(r => r.name.toLowerCase()))
    return months.map(m => {
      const monthEntries = allEntries.filter(
        e => e.month_key === m && recurringNames.has((e.description || '').toLowerCase())
      )
      const total = Math.round(monthEntries.reduce((s, e) => s + Number(e.amount_gbp), 0))
      return { month: getMonthLabel(m).split(' ')[0], total, monthKey: m }
    })
  }, [allEntries, allRecurring, months])

  const currentMonthKey = format(new Date(), 'yyyy-MM')

  // ── Days since last charge ─────────────────────────────────────────────

  function daysSince(dateStr: string): number {
    return differenceInDays(new Date(), parseISO(dateStr))
  }

  // ── Estimated next date ────────────────────────────────────────────────

  function estimatedNext(item: RecurringItem): string {
    // Find the day-of-month it usually appears on
    const days = item.entries.map(e => parseInt(e.date.split('-')[2]))
    const avgDay = Math.round(days.reduce((s, d) => s + d, 0) / days.length)
    const now = new Date()
    const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), avgDay)
    if (thisMonthDate > now) return format(thisMonthDate, 'MMM d')
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, avgDay)
    return format(nextMonthDate, 'MMM d')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Summary banner ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-card border-none col-span-1">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Active Recurring
            </p>
            <p className="text-2xl font-bold mt-1">{activeRecurring.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-none">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              /month
            </p>
            <p className="text-2xl font-bold text-ios-orange mt-1">{formatCurrency(monthlyTotal)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-none">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              /year
            </p>
            <p className="text-2xl font-bold text-ios-red mt-1">{formatCurrency(yearlyTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Monthly trend ──────────────────────────────────────────────── */}
      <Card className="shadow-card border-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-ios-blue" />
            Recurring Spend — Last 6 Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trendData} barSize={36}>
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
                formatter={v => [`£${Number(v).toFixed(0)}`, 'Recurring']}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {trendData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.monthKey === currentMonthKey ? '#007AFF' : '#D1D1D6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Item list ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {showInactive ? 'All' : 'Active'} Recurring Items
          <span className="text-muted-foreground font-normal ml-1.5">({displayed.length})</span>
        </h3>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={cn(
            'text-xs font-medium px-3 py-1.5 rounded-lg transition-all',
            showInactive
              ? 'bg-ios-blue/10 text-ios-blue'
              : 'bg-ios-gray-6 text-muted-foreground hover:text-foreground'
          )}
        >
          {showInactive ? 'Active only' : 'Show inactive'}
        </button>
      </div>

      {displayed.length === 0 ? (
        <Card className="shadow-card border-none">
          <CardContent className="py-16 text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No recurring transactions detected
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Recurring items are auto-detected when the same merchant appears in 2+ months with
              consistent amounts. Add descriptions to your expenses to enable detection.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayed.map((item, i) => (
            <Card
              key={i}
              className={cn(
                'shadow-card border-none transition-all',
                !item.isActive && 'opacity-60'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Category color dot */}
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
                    style={{ background: CATEGORY_COLORS[item.category] || '#8E8E93' }}
                  >
                    {item.name.slice(0, 1).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                      <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                        {item.category}
                      </Badge>
                      {!item.isActive && (
                        <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground shrink-0">
                          inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RefreshCcw className="h-2.5 w-2.5" />
                        {item.monthsDetected} months
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Last: {format(parseISO(item.lastDate), 'MMM d')} ({daysSince(item.lastDate)}d ago)
                      </span>
                      {item.isActive && (
                        <span className="text-xs text-ios-blue font-medium">
                          Next ≈ {estimatedNext(item)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold tabular-nums">
                      {formatCurrency(item.avgAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.avgAmount * 12)}/yr
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Auto-detected from transactions with matching descriptions in 2+ months within 30% amount variance
      </p>
    </div>
  )
}
