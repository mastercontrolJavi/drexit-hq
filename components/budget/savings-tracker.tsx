'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { formatCurrency, formatCurrencyShort } from '@/lib/utils'
import { SavingsGoal, SavingsTransaction } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Minus,
  Pencil,
  Check,
  Trash2,
  PiggyBank,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Link2,
} from 'lucide-react'

const DEFAULT_GOALS = [
  { name: 'Mexico Trip Fund', target_amount: 800, current_amount: 0 },
  { name: 'General Savings', target_amount: 1500, current_amount: 0 },
]

export function SavingsTracker() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newCurrent, setNewCurrent] = useState('')

  // Quick adjust state
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [adjustMode, setAdjustMode] = useState<'add' | 'subtract'>('add')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNote, setAdjustNote] = useState('')

  // History state
  const [historyGoalId, setHistoryGoalId] = useState<string | null>(null)
  const [historyGoalName, setHistoryGoalName] = useState('')
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      setGoals(data as SavingsGoal[])
    } else {
      const { data: seeded } = await supabase
        .from('savings_goals')
        .insert(DEFAULT_GOALS)
        .select()
      setGoals((seeded as SavingsGoal[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  async function recalcGoalAmount(goalId: string) {
    const { data } = await supabase
      .from('savings_transactions')
      .select('amount')
      .eq('goal_id', goalId)

    const total = (data || []).reduce((sum, t) => sum + Number(t.amount), 0)
    await supabase
      .from('savings_goals')
      .update({ current_amount: total })
      .eq('id', goalId)
  }

  // Quick adjust: add or subtract from a goal
  async function handleQuickAdjust() {
    if (!adjustingId || !adjustAmount) return
    const amount = parseFloat(adjustAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }

    const finalAmount = adjustMode === 'subtract' ? -amount : amount
    const { error } = await supabase.from('savings_transactions').insert({
      goal_id: adjustingId,
      amount: finalAmount,
      type: 'manual',
      note: adjustNote.trim() || null,
      date: format(new Date(), 'yyyy-MM-dd'),
    })

    if (error) {
      toast.error('Failed to record transaction')
      return
    }

    await recalcGoalAmount(adjustingId)
    toast.success(adjustMode === 'add' ? 'Deposit recorded' : 'Withdrawal recorded')
    setAdjustingId(null)
    setAdjustAmount('')
    setAdjustNote('')
    fetchGoals()
  }

  // History: view transactions for a goal
  async function openHistory(goal: SavingsGoal) {
    setHistoryGoalId(goal.id)
    setHistoryGoalName(goal.name)
    setHistoryLoading(true)

    const { data } = await supabase
      .from('savings_transactions')
      .select('*')
      .eq('goal_id', goal.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    setTransactions((data as SavingsTransaction[]) || [])
    setHistoryLoading(false)
  }

  async function deleteTransaction(txId: string, goalId: string) {
    const { error } = await supabase
      .from('savings_transactions')
      .delete()
      .eq('id', txId)

    if (error) {
      toast.error('Failed to delete transaction')
      return
    }

    await recalcGoalAmount(goalId)
    setTransactions(transactions.filter((t) => t.id !== txId))
    toast.success('Transaction deleted')
    fetchGoals()
  }

  function startEdit(goal: SavingsGoal) {
    setEditingId(goal.id)
    setEditName(goal.name)
    setEditTarget(Number(goal.target_amount).toString())
  }

  async function saveEdit() {
    if (!editingId || !editName.trim() || !editTarget) return
    const { error } = await supabase
      .from('savings_goals')
      .update({
        name: editName.trim(),
        target_amount: parseFloat(editTarget),
      })
      .eq('id', editingId)

    if (error) {
      toast.error('Failed to update goal')
      return
    }
    toast.success('Goal updated')
    setEditingId(null)
    fetchGoals()
  }

  async function handleAdd() {
    if (!newName.trim() || !newTarget) {
      toast.error('Name and target are required')
      return
    }
    const initialAmount = parseFloat(newCurrent) || 0
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        name: newName.trim(),
        target_amount: parseFloat(newTarget),
        current_amount: initialAmount,
      })
      .select()
      .single()

    if (error || !data) {
      toast.error('Failed to add goal')
      return
    }

    // Create opening balance transaction if initial amount > 0
    if (initialAmount > 0) {
      await supabase.from('savings_transactions').insert({
        goal_id: data.id,
        amount: initialAmount,
        type: 'manual',
        note: 'Opening balance',
        date: format(new Date(), 'yyyy-MM-dd'),
      })
    }

    toast.success('Goal added')
    setAddingNew(false)
    setNewName('')
    setNewTarget('')
    setNewCurrent('')
    fetchGoals()
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete')
      return
    }
    toast.success('Goal deleted')
    setGoals(goals.filter((g) => g.id !== id))
  }

  if (loading) {
    return (
      <Card className="shadow-card border-none">
        <CardHeader>
          <CardTitle>Savings Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="shadow-card border-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-ios-green" />
              Savings Tracker
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingNew(true)}
              className="active:scale-[0.98] transition-all duration-200"
            >
              <Plus className="mr-1 h-4 w-4" /> Add Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {goals.map((goal, i) => (
            <div key={goal.id}>
              {i > 0 && <Separator className="mb-5" />}
              {editingId === goal.id ? (
                /* Edit Mode — name and target only, current_amount is derived */
                <div className="space-y-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Goal name"
                    className="text-sm"
                    autoFocus
                  />
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Target (£)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editTarget}
                      onChange={(e) => setEditTarget(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={saveEdit}
                      className="bg-ios-green text-white hover:bg-ios-green/90 active:scale-[0.98] transition-all duration-200"
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                      className="active:scale-[0.98] transition-all duration-200"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleDelete(goal.id)
                        setEditingId(null)
                      }}
                      className="ml-auto text-ios-red hover:text-ios-red active:scale-[0.98] transition-all duration-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : adjustingId === goal.id ? (
                /* Quick Adjust Mode */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{goal.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-ios-gray-6">
                      {adjustMode === 'add' ? 'Deposit' : 'Withdraw'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      placeholder="Amount"
                      className="text-sm"
                      autoFocus
                    />
                    <Input
                      value={adjustNote}
                      onChange={(e) => setAdjustNote(e.target.value)}
                      placeholder="Note (optional)"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleQuickAdjust}
                      className={
                        adjustMode === 'add'
                          ? 'bg-ios-green text-white hover:bg-ios-green/90 active:scale-[0.98] transition-all duration-200'
                          : 'bg-ios-orange text-white hover:bg-ios-orange/90 active:scale-[0.98] transition-all duration-200'
                      }
                    >
                      {adjustMode === 'add' ? (
                        <><Plus className="mr-1 h-3.5 w-3.5" /> Deposit</>
                      ) : (
                        <><Minus className="mr-1 h-3.5 w-3.5" /> Withdraw</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAdjustingId(null)
                        setAdjustAmount('')
                        setAdjustNote('')
                      }}
                      className="active:scale-[0.98] transition-all duration-200"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{goal.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrencyShort(Number(goal.current_amount))} /{' '}
                      {formatCurrencyShort(Number(goal.target_amount))}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      Number(goal.target_amount) > 0
                        ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
                        : 0
                    )}
                    className="h-2"
                  />
                  {Number(goal.current_amount) >= Number(goal.target_amount) &&
                    Number(goal.target_amount) > 0 && (
                      <p className="mt-1 text-xs text-ios-green font-medium">Goal reached!</p>
                    )}
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      onClick={() => {
                        setAdjustingId(goal.id)
                        setAdjustMode('add')
                      }}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-ios-green/10 text-ios-green hover:bg-ios-green/20 transition-colors"
                      title="Add deposit"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                    <button
                      onClick={() => {
                        setAdjustingId(goal.id)
                        setAdjustMode('subtract')
                      }}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-ios-orange/10 text-ios-orange hover:bg-ios-orange/20 transition-colors"
                      title="Withdraw"
                    >
                      <Minus className="h-3 w-3" /> Withdraw
                    </button>
                    <button
                      onClick={() => openHistory(goal)}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-ios-blue/10 text-ios-blue hover:bg-ios-blue/20 transition-colors"
                      title="View history"
                    >
                      <History className="h-3 w-3" /> History
                    </button>
                    <button
                      onClick={() => startEdit(goal)}
                      className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit goal"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New Goal Form */}
          {addingNew && (
            <>
              <Separator />
              <div className="space-y-3">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Goal name"
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] text-muted-foreground">Starting (£)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newCurrent}
                      onChange={(e) => setNewCurrent(e.target.value)}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-muted-foreground">Target (£)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    className="bg-ios-blue text-white hover:bg-ios-blue/90 active:scale-[0.98] transition-all duration-200"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddingNew(false)}
                    className="active:scale-[0.98] transition-all duration-200"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}

          {goals.length === 0 && !addingNew && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No savings goals yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transaction History Dialog */}
      <Dialog
        open={historyGoalId !== null}
        onOpenChange={(open) => {
          if (!open) setHistoryGoalId(null)
        }}
      >
        <DialogContent className="max-w-md max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-ios-blue" />
              {historyGoalName} — History
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {historyLoading ? (
              <div className="space-y-3 py-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-2 py-2">
                {transactions.map((tx) => {
                  const isPositive = Number(tx.amount) >= 0
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-ios-gray-6 transition-colors group"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          tx.type === 'budget_link'
                            ? 'bg-ios-purple/10'
                            : isPositive
                            ? 'bg-ios-green/10'
                            : 'bg-ios-orange/10'
                        }`}
                      >
                        {tx.type === 'budget_link' ? (
                          <Link2 className="h-3.5 w-3.5 text-ios-purple" />
                        ) : isPositive ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-ios-green" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-ios-orange" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {tx.note || (isPositive ? 'Deposit' : 'Withdrawal')}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(tx.date), 'MMM d, yyyy')}
                          {tx.type === 'budget_link' && ' · Budget linked'}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          isPositive ? 'text-ios-green' : 'text-ios-orange'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(Number(tx.amount))}
                      </span>
                      <button
                        onClick={() =>
                          historyGoalId && deleteTransaction(tx.id, historyGoalId)
                        }
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-ios-red transition-all"
                        title="Delete transaction"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
