'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format, getDaysInMonth, subMonths } from 'date-fns'
import {
  formatCurrency,
  formatCurrencyShort,
  getCurrentMonthKey,
  getMonthLabel,
  daysElapsedInMonth,
  cn,
} from '@/lib/utils'
import {
  BudgetEntry,
  SavingsGoal,
  BUDGET_CATEGORIES,
} from '@/types'
import { useIncome } from '@/lib/hooks/use-income'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Wallet,
  ShoppingCart,
  PiggyBank,
  Trash2,
  AlertTriangle,
  Link2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
} from 'lucide-react'
import { CsvImport } from './csv-import'
import { SavingsTracker } from './savings-tracker'
import { BudgetAnalytics } from './budget-analytics'

function generateMonthOptions() {
  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = subMonths(now, i)
    months.push(format(d, 'yyyy-MM'))
  }
  return months
}

export function BudgetClient() {
  const { income, updateIncome } = useIncome()
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey())
  const [entries, setEntries] = useState<BudgetEntry[]>([])
  const [loading, setLoading] = useState(true)
  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formCategory, setFormCategory] = useState<string>('')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formSavingsGoal, setFormSavingsGoal] = useState<string>('')
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])

  const monthOptions = generateMonthOptions()

  // Fetch savings goals for the linking dropdown
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

  const [linkedEntryIds, setLinkedEntryIds] = useState<Set<string>>(new Set())
  const [expensesExpanded, setExpensesExpanded] = useState(false)

  const VISIBLE_ROWS = 5
  const visibleEntries = expensesExpanded ? entries : entries.slice(0, VISIBLE_ROWS)
  const hasMore = entries.length > VISIBLE_ROWS

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('budget_entries')
      .select('*')
      .eq('month_key', selectedMonth)
      .order('date', { ascending: false })
    const entryList = (data as BudgetEntry[]) || []
    setEntries(entryList)

    // Check which entries have linked savings transactions
    if (entryList.length > 0) {
      const ids = entryList.map((e) => e.id)
      const { data: txData } = await supabase
        .from('savings_transactions')
        .select('linked_entry_id')
        .in('linked_entry_id', ids)
      const linked = new Set((txData || []).map((t) => t.linked_entry_id).filter(Boolean) as string[])
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

  // Burn rate projection
  const elapsed = daysElapsedInMonth()
  const dailyAvg = elapsed > 0 ? totalSpent / elapsed : 0
  const projectedSpend = dailyAvg * getDaysInMonth(new Date())
  const showBurnWarning = isCurrentMonth && projectedSpend > income && elapsed > 3

  function handleIncomeSave() {
    const val = parseFloat(incomeInput)
    if (!isNaN(val) && val > 0) {
      updateIncome(val)
    }
    setEditingIncome(false)
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!formCategory || !formAmount) {
      toast.error('Category and amount are required')
      return
    }
    const monthKey = format(new Date(formDate), 'yyyy-MM')
    const amount = parseFloat(formAmount)

    const { data: inserted, error } = await supabase
      .from('budget_entries')
      .insert({
        date: formDate,
        category: formCategory,
        description: formDescription || null,
        amount_gbp: amount,
        month_key: monthKey,
      })
      .select()
      .single()

    if (error || !inserted) {
      toast.error('Failed to add expense')
      return
    }

    // Link to savings goal if selected
    if (formSavingsGoal && formSavingsGoal !== 'none') {
      const { error: txError } = await supabase.from('savings_transactions').insert({
        goal_id: formSavingsGoal,
        amount: -amount,
        type: 'budget_link',
        note: `Budget: ${formDescription || formCategory}`,
        linked_entry_id: inserted.id,
        date: formDate,
      })
      if (!txError) {
        // Recalc goal amount
        const { data: txData } = await supabase
          .from('savings_transactions')
          .select('amount')
          .eq('goal_id', formSavingsGoal)
        const total = (txData || []).reduce((sum, t) => sum + Number(t.amount), 0)
        await supabase
          .from('savings_goals')
          .update({ current_amount: total })
          .eq('id', formSavingsGoal)
        fetchSavingsGoals()
      }
    }

    toast.success(formSavingsGoal ? 'Expense added & linked to savings' : 'Expense added')
    setFormDescription('')
    setFormAmount('')
    setFormSavingsGoal('')
    if (monthKey === selectedMonth) fetchEntries()
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('budget_entries').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete')
      return
    }
    toast.success('Expense deleted')
    setEntries(entries.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-8">
      {/* Month Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {monthOptions.map((m) => (
          <button
            key={m}
            onClick={() => { setSelectedMonth(m); setExpensesExpanded(false) }}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]',
              m === selectedMonth
                ? 'bg-[rgba(0,122,255,0.1)] text-ios-blue'
                : 'text-muted-foreground hover:bg-ios-gray-6'
            )}
          >
            {getMonthLabel(m)}
          </button>
        ))}
      </div>

      {/* Monthly Overview */}
      {loading ? (
        <div className="grid grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {/* Income Card */}
          <Card className="shadow-card border-none">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-ios-blue" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Income
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (editingIncome) {
                      handleIncomeSave()
                    } else {
                      setIncomeInput(String(income))
                      setEditingIncome(true)
                    }
                  }}
                  className="text-muted-foreground hover:text-ios-blue transition-colors"
                >
                  {editingIncome ? <Check className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
                </button>
              </div>
              {editingIncome ? (
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleIncomeSave()}
                  onBlur={handleIncomeSave}
                  className="mt-2 text-2xl font-bold h-12"
                  autoFocus
                />
              ) : (
                <div className="mt-3 text-[40px] font-bold leading-none tracking-tight text-ios-blue">
                  {formatCurrencyShort(income)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spent Card */}
          <Card className="shadow-card border-none">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-ios-orange" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Spent
                </span>
              </div>
              <div className="mt-3 text-[40px] font-bold leading-none tracking-tight text-ios-orange">
                {formatCurrencyShort(totalSpent)}
              </div>
            </CardContent>
          </Card>

          {/* Remaining Card */}
          <Card className="shadow-card border-none">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                <PiggyBank className={cn('h-4 w-4', remaining >= 0 ? 'text-ios-green' : 'text-ios-red')} />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Remaining
                </span>
              </div>
              <div className={cn('mt-3 text-[40px] font-bold leading-none tracking-tight', remaining >= 0 ? 'text-ios-green' : 'text-ios-red')}>
                {formatCurrencyShort(remaining)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Burn Rate Warning */}
      {showBurnWarning && (
        <div className="flex items-center gap-3 rounded-xl bg-ios-red/10 p-4 text-ios-red">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Projected monthly spend of {formatCurrency(projectedSpend)} exceeds budget by{' '}
            {formatCurrency(projectedSpend - income)}
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Expense Form */}
        <Card className="shadow-card border-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Add Expense</CardTitle>
              <CsvImport onImportComplete={fetchEntries} />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formCategory} onValueChange={(v) => setFormCategory(v ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (GBP)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {savingsGoals.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-ios-purple" />
                    Link to Savings Goal
                  </Label>
                  <Select value={formSavingsGoal} onValueChange={(v) => setFormSavingsGoal(v ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="None (optional)" />
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
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-ios-blue text-white hover:bg-ios-blue/90 active:scale-[0.98] transition-all duration-200"
              >
                Add Expense
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Savings Tracker */}
        <SavingsTracker />
      </div>

      {/* Inline Edit Category */}
      {/* Expense Table */}
      <Card className="shadow-card border-none">
        <CardHeader>
          <CardTitle>Expenses — {getMonthLabel(selectedMonth)}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No expenses logged for this month
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="hover:bg-ios-gray-6 transition-colors"
                  >
                    <TableCell className="text-sm">
                      {format(new Date(entry.date), 'MMM d')}
                    </TableCell>
                    <TableCell>
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
                          toast.success('Category updated')
                        }}
                      >
                        <SelectTrigger className="h-7 w-[120px] text-xs rounded-full bg-ios-gray-6 border-none">
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
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        {entry.description || '—'}
                        {linkedEntryIds.has(entry.id) && (
                          <span title="Linked to savings goal"><PiggyBank className="h-3.5 w-3.5 text-ios-purple shrink-0" /></span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(Number(entry.amount_gbp))}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-muted-foreground hover:text-ios-red transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {hasMore && (
            <button
              onClick={() => setExpensesExpanded(!expensesExpanded)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-ios-blue hover:bg-ios-gray-6 transition-colors"
            >
              {expensesExpanded ? (
                <>Show less <ChevronUp className="h-4 w-4" /></>
              ) : (
                <>Show all {entries.length} expenses <ChevronDown className="h-4 w-4" /></>
              )}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Analytics */}
      <BudgetAnalytics
        entries={entries}
        selectedMonth={selectedMonth}
        income={income}
        onMonthClick={(monthKey) => { setSelectedMonth(monthKey); setExpensesExpanded(false) }}
      />
    </div>
  )
}
