'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format, getDaysInMonth, subDays, subMonths } from 'date-fns'
import {
  cn,
  daysElapsedInMonth,
  formatCurrency,
  formatCurrencyShort,
  getCurrentMonthKey,
  getMonthLabel,
} from '@/lib/utils'
import {
  BUDGET_CATEGORIES,
  type BudgetCategory,
  type BudgetEntry,
  type SavingsGoal,
} from '@/types'
import { useIncome } from '@/lib/hooks/use-income'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, Check, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { CsvImport } from './csv-import'
import { SavingsTracker } from './savings-tracker'
import { BudgetAnalytics } from './budget-analytics'
import { Sparkline } from '@/components/data/sparkline'
import { UnderlineTabs, type UnderlineTabOption } from '@/components/data/underline-tabs'

const COMMAND_HINT = '£ amount  category  [description...]'

function generateMonthOptions(): UnderlineTabOption[] {
  const now = new Date()
  const out: UnderlineTabOption[] = []
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i)
    const value = format(d, 'yyyy-MM')
    out.push({ value, label: format(d, 'MMM').toUpperCase(), hint: format(d, 'yy') })
  }
  return out
}

/**
 * Parse a command string like "£45 Groceries Weekly shop" or "12.50 Cash".
 * Returns null if the line can't be parsed.
 */
function parseCommandLine(raw: string): { amount: number; category: BudgetCategory; description: string | null } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const m = trimmed.match(/^£?\s*(\d+(?:\.\d{1,2})?)\s+(\S+)\s*(.*)$/i)
  if (!m) return null

  const amount = parseFloat(m[1])
  if (!Number.isFinite(amount) || amount <= 0) return null

  const catRaw = m[2]
  const category = BUDGET_CATEGORIES.find(
    (c) => c.toLowerCase() === catRaw.toLowerCase(),
  )
  if (!category) return null

  const description = m[3].trim() || null
  return { amount, category, description }
}

export function BudgetClient() {
  const { income, updateIncome } = useIncome()
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey())
  const [entries, setEntries] = useState<BudgetEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [linkedEntryIds, setLinkedEntryIds] = useState<Set<string>>(new Set())
  const [expensesExpanded, setExpensesExpanded] = useState(false)
  const VISIBLE_ROWS = 5
  const visibleEntries = expensesExpanded ? entries : entries.slice(0, VISIBLE_ROWS)
  const hasMore = entries.length > VISIBLE_ROWS

  // Command-bar state
  const [commandInput, setCommandInput] = useState('')
  const [commandError, setCommandError] = useState<string | null>(null)

  // Traditional form state
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formCategory, setFormCategory] = useState<string>('')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formSavingsGoal, setFormSavingsGoal] = useState<string>('')
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])

  const monthOptions = generateMonthOptions()

  const fetchSavingsGoals = useCallback(async () => {
    const { data } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: true })
    setSavingsGoals((data as SavingsGoal[]) || [])
  }, [])

  useEffect(() => {
    fetchSavingsGoals()
  }, [fetchSavingsGoals])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('budget_entries')
      .select('*')
      .eq('month_key', selectedMonth)
      .order('date', { ascending: false })
    const list = (data as BudgetEntry[]) || []
    setEntries(list)

    if (list.length > 0) {
      const ids = list.map((e) => e.id)
      const { data: txData } = await supabase
        .from('savings_transactions')
        .select('linked_entry_id')
        .in('linked_entry_id', ids)
      const linked = new Set(
        (txData || []).map((t) => t.linked_entry_id).filter(Boolean) as string[],
      )
      setLinkedEntryIds(linked)
    } else {
      setLinkedEntryIds(new Set())
    }
    setLoading(false)
  }, [selectedMonth])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const totalSpent = entries.reduce((sum, e) => sum + Number(e.amount_gbp), 0)
  const remaining = income - totalSpent
  const isCurrentMonth = selectedMonth === getCurrentMonthKey()

  const elapsed = daysElapsedInMonth()
  const dailyAvg = elapsed > 0 ? totalSpent / elapsed : 0
  const projectedSpend = dailyAvg * getDaysInMonth(new Date())
  const showBurnWarning = isCurrentMonth && projectedSpend > income && elapsed > 3

  // Build cumulative-spend sparkline for the current month (up to today)
  const monthDays = getDaysInMonth(new Date())
  const targetEnd = isCurrentMonth ? elapsed : monthDays
  const cumulative: number[] = []
  let running = 0
  for (let d = 1; d <= targetEnd; d++) {
    const day = `${selectedMonth}-${String(d).padStart(2, '0')}`
    running += entries
      .filter((e) => e.date === day)
      .reduce((s, e) => s + Number(e.amount_gbp), 0)
    cumulative.push(Math.round(running))
  }
  const remainingSeries = cumulative.map((c) => Math.round(income - c))
  const incomeLen = cumulative.length || 7
  const incomeSeries = Array.from({ length: incomeLen }, (_, i) => Math.round(income * ((i + 1) / incomeLen)))

  // 7-day spend velocity for the command bar caption
  const today = format(new Date(), 'yyyy-MM-dd')
  const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd')
  const velocity7d = entries
    .filter((e) => e.date >= sevenDaysAgo && e.date <= today)
    .reduce((s, e) => s + Number(e.amount_gbp), 0)

  function handleIncomeSave() {
    const val = parseFloat(incomeInput)
    if (!isNaN(val) && val > 0) updateIncome(val)
    setEditingIncome(false)
  }

  async function submitEntry(
    date: string,
    category: string,
    description: string | null,
    amount: number,
    savingsGoalId?: string,
  ) {
    const monthKey = format(new Date(date), 'yyyy-MM')
    const { data: inserted, error } = await supabase
      .from('budget_entries')
      .insert({ date, category, description, amount_gbp: amount, month_key: monthKey })
      .select()
      .single()

    if (error || !inserted) {
      toast.error('Failed to add expense')
      return
    }

    if (savingsGoalId && savingsGoalId !== 'none') {
      const { error: txError } = await supabase.from('savings_transactions').insert({
        goal_id: savingsGoalId,
        amount: -amount,
        type: 'budget_link',
        note: `Budget: ${description || category}`,
        linked_entry_id: inserted.id,
        date,
      })
      if (!txError) {
        const { data: txData } = await supabase
          .from('savings_transactions')
          .select('amount')
          .eq('goal_id', savingsGoalId)
        const total = (txData || []).reduce((sum, t) => sum + Number(t.amount), 0)
        await supabase.from('savings_goals').update({ current_amount: total }).eq('id', savingsGoalId)
        fetchSavingsGoals()
      }
    }

    toast.success(savingsGoalId ? 'Logged & linked to savings' : 'Logged')
    if (monthKey === selectedMonth) fetchEntries()
  }

  async function handleCommand(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseCommandLine(commandInput)
    if (!parsed) {
      setCommandError(`unable to parse — expected "${COMMAND_HINT}"`)
      return
    }
    setCommandError(null)
    await submitEntry(format(new Date(), 'yyyy-MM-dd'), parsed.category, parsed.description, parsed.amount)
    setCommandInput('')
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!formCategory || !formAmount) {
      toast.error('Category and amount are required')
      return
    }
    await submitEntry(
      formDate,
      formCategory,
      formDescription || null,
      parseFloat(formAmount),
      formSavingsGoal,
    )
    setFormDescription('')
    setFormAmount('')
    setFormSavingsGoal('')
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('budget_entries').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete')
      return
    }
    toast.success('Deleted')
    setEntries(entries.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Month switcher */}
      <UnderlineTabs
        options={monthOptions}
        value={selectedMonth}
        onChange={(v) => {
          setSelectedMonth(v)
          setExpensesExpanded(false)
        }}
        scroll
      />

      {/* Hero — Income / Spent / Remaining */}
      <div className="grid grid-cols-1 md:grid-cols-3 border border-border bg-bg-elevated divide-y md:divide-y-0 md:divide-x divide-border">
        {/* INCOME */}
        <div className="px-6 py-5">
          <div className="flex items-baseline justify-between">
            <span className="caption text-text-2">INCOME</span>
            <button
              onClick={() => {
                if (editingIncome) {
                  handleIncomeSave()
                } else {
                  setIncomeInput(String(income))
                  setEditingIncome(true)
                }
              }}
              className="text-text-3 transition-colors hover:text-text-1"
              aria-label="Edit income"
            >
              {editingIncome ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Pencil className="h-3 w-3" strokeWidth={1.5} />}
            </button>
          </div>
          {editingIncome ? (
            <input
              type="number"
              step="1"
              min="0"
              autoFocus
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              onBlur={handleIncomeSave}
              onKeyDown={(e) => e.key === 'Enter' && handleIncomeSave()}
              className="mt-2 block w-full bg-transparent num-display text-[32px] md:text-[48px] leading-none text-text-1 focus:outline-none"
            />
          ) : (
            <div className="num-display mt-2 text-[32px] md:text-[48px] leading-none text-text-1">
              {formatCurrencyShort(income)}
            </div>
          )}
          <div className="mt-3 text-text-3">
            <Sparkline data={incomeSeries} width={140} height={16} />
          </div>
        </div>

        {/* SPENT */}
        <div className="px-6 py-5">
          <div className="flex items-baseline justify-between">
            <span className="caption text-text-2">SPENT</span>
            <span className="caption text-text-3">{entries.length} ENTRIES</span>
          </div>
          <div className="num-display mt-2 text-[32px] md:text-[48px] leading-none text-text-1">
            {formatCurrencyShort(totalSpent)}
          </div>
          <div className="mt-3 text-text-2">
            <Sparkline data={cumulative.length > 1 ? cumulative : [0, 0]} width={140} height={16} />
          </div>
        </div>

        {/* REMAINING */}
        <div className="px-6 py-5">
          <div className="flex items-baseline justify-between">
            <span className="caption text-text-2">REMAINING</span>
            <span className="caption text-text-3">
              7D {formatCurrencyShort(velocity7d)}
            </span>
          </div>
          <div
            className={cn(
              'num-display mt-2 text-[32px] md:text-[48px] leading-none',
              remaining >= 0 ? 'text-success' : 'text-danger',
            )}
          >
            {formatCurrencyShort(remaining)}
          </div>
          <div className={cn('mt-3', remaining >= 0 ? 'text-success' : 'text-danger')}>
            <Sparkline
              data={remainingSeries.length > 1 ? remainingSeries : [income, income]}
              width={140}
              height={16}
              zeroBaseline
            />
          </div>
        </div>
      </div>

      {/* Burn warning */}
      {showBurnWarning && (
        <div className="flex items-center gap-3 border border-danger/40 bg-bg-elevated px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-danger" strokeWidth={1.5} />
          <p className="font-mono text-[12px] tabular-nums text-danger">
            PROJECTED <span className="text-text-1">{formatCurrency(projectedSpend)}</span>{' '}
            EXCEEDS BUDGET BY{' '}
            <span className="text-text-1">{formatCurrency(projectedSpend - income)}</span>
          </p>
        </div>
      )}

      {/* Command bar entry */}
      <section className="border border-border bg-bg-elevated">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="caption text-text-2">QUICK_LOG</span>
          <span className="caption text-text-3">{COMMAND_HINT}</span>
        </header>
        <form onSubmit={handleCommand} className="flex items-center gap-2 px-3 py-3 md:py-2.5 min-h-[48px] md:min-h-0">
          <span className="font-mono text-sm text-text-3">&gt;</span>
          <input
            value={commandInput}
            onChange={(e) => {
              setCommandInput(e.target.value)
              if (commandError) setCommandError(null)
            }}
            placeholder="£12.50 Groceries Tesco run"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent font-mono text-sm tabular-nums text-text-1 placeholder:text-text-3 focus:outline-none"
          />
          <button
            type="submit"
            className="caption shrink-0 border border-border px-3 py-1.5 text-text-2 transition-colors duration-200 ease-out-200 hover:border-text-1 hover:text-text-1"
          >
            LOG
          </button>
        </form>
        {commandError && (
          <div className="border-t border-border px-4 py-2 font-mono text-[11px] text-danger">
            ! {commandError}
          </div>
        )}

        {/* Traditional form, collapsed by default */}
        <details className="border-t border-border">
          <summary className="caption flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-text-3 hover:text-text-1">
            <span>FULL_FORM</span>
            <span className="text-text-3">▾</span>
          </summary>
          <form onSubmit={handleAddExpense} className="space-y-3 border-t border-border p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="caption text-text-2">DATE</span>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] tabular-nums text-text-1 focus:border-text-2 focus:outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="caption text-text-2">CATEGORY</span>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v ?? '')}>
                  <SelectTrigger className="h-8 rounded-none border-border bg-transparent font-mono text-[13px]">
                    <SelectValue placeholder="select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <label className="space-y-1 block">
              <span className="caption text-text-2">DESCRIPTION</span>
              <input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="optional"
                className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
            </label>
            <label className="space-y-1 block">
              <span className="caption text-text-2">AMOUNT (£)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] tabular-nums text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
            </label>
            {savingsGoals.length > 0 && (
              <label className="space-y-1 block">
                <span className="caption text-text-2">LINK TO SAVINGS</span>
                <Select value={formSavingsGoal} onValueChange={(v) => setFormSavingsGoal(v ?? '')}>
                  <SelectTrigger className="h-8 rounded-none border-border bg-transparent font-mono text-[13px]">
                    <SelectValue placeholder="none (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {savingsGoals.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} ({formatCurrencyShort(Number(g.current_amount))} / {formatCurrencyShort(Number(g.target_amount))})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}
            <button
              type="submit"
              className="caption block w-full border border-text-1 bg-text-1 px-3 py-2 text-bg-base transition-colors duration-200 ease-out-200 hover:bg-bg-base hover:text-text-1"
            >
              ADD EXPENSE
            </button>
          </form>
        </details>
      </section>

      {/* Savings + CSV import row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SavingsTracker />
        <section className="border border-border bg-bg-elevated">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="caption text-text-2">IMPORT</span>
            <span className="caption text-text-3">CSV / XLSX</span>
          </header>
          <div className="p-4">
            <p className="font-mono text-xs text-text-3 mb-3">
              &gt; map columns and bulk-import bank statements
            </p>
            <CsvImport onImportComplete={fetchEntries} />
          </div>
        </section>
      </div>

      {/* Expense table */}
      <section className="border border-border bg-bg-elevated">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="caption text-text-2">EXPENSES · {getMonthLabel(selectedMonth).toUpperCase()}</span>
          <span className="caption text-text-3">
            {entries.length} ROWS · {formatCurrencyShort(totalSpent)}
          </span>
        </header>

        {loading ? (
          <ul>
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="border-b border-border px-4 py-3 last:border-b-0">
                <div className="h-4 w-3/4 animate-pulse bg-bg-hover" />
              </li>
            ))}
          </ul>
        ) : entries.length === 0 ? (
          <p className="font-mono text-xs text-text-3 px-4 py-6">&gt; no expenses logged</p>
        ) : (
          <div className="overflow-x-auto">
            {/* Header row */}
            <div className="grid grid-cols-[80px_140px_1fr_100px_32px] gap-3 border-b border-border bg-bg-hover px-4 py-2 caption text-text-3 min-w-[440px]">
              <span>DATE</span>
              <span>CATEGORY</span>
              <span>DESCRIPTION</span>
              <span className="text-right">AMOUNT</span>
              <span />
            </div>
            <ul>
              {visibleEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="group grid grid-cols-[80px_140px_1fr_100px_32px] items-center gap-3 border-b border-border px-4 py-2 last:border-b-0 transition-colors duration-200 ease-out-200 hover:bg-bg-hover min-w-[440px]"
                >
                  <span className="font-mono text-[12px] tabular-nums text-text-2">
                    {format(new Date(entry.date), 'MMM dd').toUpperCase()}
                  </span>
                  <Select
                    value={entry.category}
                    onValueChange={async (v) => {
                      if (!v) return
                      const { error } = await supabase
                        .from('budget_entries')
                        .update({ category: v })
                        .eq('id', entry.id)
                      if (error) {
                        toast.error('Failed to update category')
                        return
                      }
                      setEntries(entries.map((e) =>
                        e.id === entry.id ? { ...e, category: v as BudgetEntry['category'] } : e
                      ))
                    }}
                  >
                    <SelectTrigger className="h-7 rounded-none border-none bg-transparent px-0 font-mono text-[11px] uppercase tracking-[0.06em] text-text-1 hover:underline">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="truncate text-[12px] text-text-2">
                    {entry.description || '—'}
                    {linkedEntryIds.has(entry.id) && (
                      <span className="ml-2 caption text-accent">·LINKED</span>
                    )}
                  </span>
                  <span className="text-right font-mono text-[13px] tabular-nums text-text-1">
                    {formatCurrency(Number(entry.amount_gbp))}
                  </span>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="invisible justify-self-end text-text-3 transition-colors hover:text-danger group-hover:visible focus:visible"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasMore && (
          <button
            onClick={() => setExpensesExpanded(!expensesExpanded)}
            className="caption flex w-full items-center justify-center gap-1.5 border-t border-border py-2 text-text-2 transition-colors hover:bg-bg-hover hover:text-text-1"
          >
            {expensesExpanded ? (
              <>SHOW LESS <ChevronUp className="h-3 w-3" strokeWidth={1.5} /></>
            ) : (
              <>SHOW {entries.length} ROWS <ChevronDown className="h-3 w-3" strokeWidth={1.5} /></>
            )}
          </button>
        )}
      </section>

      {/* Analytics */}
      <BudgetAnalytics
        entries={entries}
        selectedMonth={selectedMonth}
        income={income}
        onMonthClick={(monthKey) => {
          setSelectedMonth(monthKey)
          setExpensesExpanded(false)
        }}
      />
    </div>
  )
}

