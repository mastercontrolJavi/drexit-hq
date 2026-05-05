'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn, formatCurrency, formatCurrencyShort } from '@/lib/utils'
import type { SavingsGoal, SavingsTransaction } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  History,
  Link2,
  Minus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { HairlineProgress } from '@/components/data/hairline-progress'

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

  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [adjustMode, setAdjustMode] = useState<'add' | 'subtract'>('add')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNote, setAdjustNote] = useState('')

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
    await supabase.from('savings_goals').update({ current_amount: total }).eq('id', goalId)
  }

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
    const { error } = await supabase.from('savings_transactions').delete().eq('id', txId)
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
      .update({ name: editName.trim(), target_amount: parseFloat(editTarget) })
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

  return (
    <>
      <section className="border border-border bg-bg-elevated">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="caption text-text-2">SAVINGS</span>
          <button
            onClick={() => setAddingNew(true)}
            className="caption flex items-center gap-1 text-text-2 transition-colors hover:text-text-1"
          >
            <Plus className="h-3 w-3" strokeWidth={1.5} /> ADD GOAL
          </button>
        </header>

        <div className="p-4 space-y-4">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-1/2 animate-pulse bg-bg-hover" />
                <div className="h-0.5 w-full animate-pulse bg-bg-hover" />
              </div>
            ))
          ) : (
            goals.map((goal) => (
              <div key={goal.id}>
                {editingId === goal.id ? (
                  <div className="space-y-2 border border-border-strong p-3">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Goal name"
                      className="block w-full bg-transparent font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none"
                    />
                    <div>
                      <span className="caption text-text-2">TARGET (£)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editTarget}
                        onChange={(e) => setEditTarget(e.target.value)}
                        className="mt-1 block w-full border border-border bg-transparent px-2 py-1 font-mono text-[13px] tabular-nums text-text-1 focus:border-text-2 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="caption flex items-center gap-1 border border-success px-2 py-1 text-success hover:bg-success hover:text-bg-base"
                      >
                        <Check className="h-3 w-3" strokeWidth={1.5} /> SAVE
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="caption border border-border px-2 py-1 text-text-2 hover:border-text-1 hover:text-text-1"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={() => {
                          handleDelete(goal.id)
                          setEditingId(null)
                        }}
                        className="caption ml-auto border border-border px-2 py-1 text-text-3 hover:border-danger hover:text-danger"
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ) : adjustingId === goal.id ? (
                  <div className="space-y-2 border border-border-strong p-3">
                    <div className="flex items-center gap-2 caption">
                      <span className="text-text-1">{goal.name.toUpperCase()}</span>
                      <span className={adjustMode === 'add' ? 'text-success' : 'text-warn'}>
                        · {adjustMode === 'add' ? 'DEPOSIT' : 'WITHDRAW'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        min="0"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        placeholder="amount"
                        className="block w-32 border border-border bg-transparent px-2 py-1 font-mono text-[13px] tabular-nums text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
                      />
                      <input
                        value={adjustNote}
                        onChange={(e) => setAdjustNote(e.target.value)}
                        placeholder="note (optional)"
                        className="block flex-1 border border-border bg-transparent px-2 py-1 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleQuickAdjust}
                        className={cn(
                          'caption flex items-center gap-1 border px-2 py-1',
                          adjustMode === 'add'
                            ? 'border-success text-success hover:bg-success hover:text-bg-base'
                            : 'border-warn text-warn hover:bg-warn hover:text-bg-base',
                        )}
                      >
                        {adjustMode === 'add' ? (
                          <><Plus className="h-3 w-3" strokeWidth={1.5} /> DEPOSIT</>
                        ) : (
                          <><Minus className="h-3 w-3" strokeWidth={1.5} /> WITHDRAW</>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setAdjustingId(null)
                          setAdjustAmount('')
                          setAdjustNote('')
                        }}
                        className="caption border border-border px-2 py-1 text-text-2 hover:border-text-1 hover:text-text-1"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-text-1">{goal.name}</span>
                      <span className="font-mono text-[12px] tabular-nums text-text-3">
                        <span className="text-text-1">{formatCurrencyShort(Number(goal.current_amount))}</span>
                        /{formatCurrencyShort(Number(goal.target_amount))}
                      </span>
                    </div>
                    <HairlineProgress
                      value={
                        Number(goal.target_amount) > 0
                          ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
                          : 0
                      }
                      tone={
                        Number(goal.current_amount) >= Number(goal.target_amount) && Number(goal.target_amount) > 0
                          ? 'success'
                          : 'accent'
                      }
                      height={2}
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        onClick={() => {
                          setAdjustingId(goal.id)
                          setAdjustMode('add')
                        }}
                        className="caption flex items-center gap-1 text-text-3 hover:text-success"
                      >
                        <Plus className="h-3 w-3" strokeWidth={1.5} /> ADD
                      </button>
                      <button
                        onClick={() => {
                          setAdjustingId(goal.id)
                          setAdjustMode('subtract')
                        }}
                        className="caption flex items-center gap-1 text-text-3 hover:text-warn"
                      >
                        <Minus className="h-3 w-3" strokeWidth={1.5} /> WITHDRAW
                      </button>
                      <button
                        onClick={() => openHistory(goal)}
                        className="caption flex items-center gap-1 text-text-3 hover:text-text-1"
                      >
                        <History className="h-3 w-3" strokeWidth={1.5} /> HISTORY
                      </button>
                      <button
                        onClick={() => startEdit(goal)}
                        className="ml-auto text-text-3 transition-colors hover:text-text-1"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {addingNew && (
            <div className="space-y-2 border-t border-border pt-4">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="goal name"
                className="block w-full bg-transparent font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <span className="caption text-text-2">STARTING (£)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={newCurrent}
                    onChange={(e) => setNewCurrent(e.target.value)}
                    placeholder="0"
                    className="mt-1 block w-full border border-border bg-transparent px-2 py-1 font-mono text-[13px] tabular-nums text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <span className="caption text-text-2">TARGET (£)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="0"
                    className="mt-1 block w-full border border-border bg-transparent px-2 py-1 font-mono text-[13px] tabular-nums text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  className="caption flex items-center gap-1 border border-text-1 bg-text-1 px-2 py-1 text-bg-base hover:bg-bg-base hover:text-text-1"
                >
                  <Plus className="h-3 w-3" strokeWidth={1.5} /> ADD
                </button>
                <button
                  onClick={() => setAddingNew(false)}
                  className="caption border border-border px-2 py-1 text-text-2 hover:border-text-1 hover:text-text-1"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {goals.length === 0 && !addingNew && (
            <p className="font-mono text-xs text-text-3">&gt; no savings goals</p>
          )}
        </div>
      </section>

      {/* Transaction history dialog */}
      <Dialog
        open={historyGoalId !== null}
        onOpenChange={(open) => {
          if (!open) setHistoryGoalId(null)
        }}
      >
        <DialogContent
          className="!max-w-md !rounded-none !border !border-border-strong !bg-bg-elevated !p-0 !ring-0"
          showCloseButton={false}
        >
          <DialogHeader className="border-b border-border px-4 py-2.5">
            <DialogTitle className="flex items-center justify-between">
              <span className="caption text-text-2">{historyGoalName.toUpperCase()} · HISTORY</span>
              <button
                onClick={() => setHistoryGoalId(null)}
                className="text-text-3 hover:text-text-1"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {historyLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-9 animate-pulse bg-bg-hover" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="px-4 py-8 font-mono text-xs text-text-3">&gt; no transactions</p>
            ) : (
              <ul>
                {transactions.map((tx) => {
                  const isPositive = Number(tx.amount) >= 0
                  const isLink = tx.type === 'budget_link'
                  return (
                    <li
                      key={tx.id}
                      className="group grid grid-cols-[20px_1fr_auto_24px] items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-bg-hover"
                    >
                      <span className={isLink ? 'text-accent' : isPositive ? 'text-success' : 'text-warn'}>
                        {isLink ? <Link2 className="h-3 w-3" strokeWidth={1.5} /> : isPositive ? <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} /> : <ArrowDownRight className="h-3 w-3" strokeWidth={1.5} />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-text-1">
                          {tx.note || (isPositive ? 'Deposit' : 'Withdrawal')}
                        </p>
                        <p className="caption text-text-3">
                          {format(new Date(tx.date), 'MMM d, yyyy')}
                          {isLink && ' · BUDGET'}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'font-mono text-[13px] tabular-nums',
                          isPositive ? 'text-success' : 'text-warn',
                        )}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(Number(tx.amount))}
                      </span>
                      <button
                        onClick={() => historyGoalId && deleteTransaction(tx.id, historyGoalId)}
                        className="invisible justify-self-end text-text-3 hover:text-danger group-hover:visible"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
