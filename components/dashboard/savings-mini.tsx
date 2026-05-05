'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrencyShort } from '@/lib/utils'
import type { SavingsGoal } from '@/types'
import { HairlineProgress } from '@/components/data/hairline-progress'

export function SavingsMini() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGoals = useCallback(async () => {
    const { data } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: true })
    setGoals((data as SavingsGoal[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0)
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0)
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  return (
    <section className="border border-border bg-bg-elevated">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="caption text-text-2">SAVINGS</span>
        <span className="font-mono text-[12px] tabular-nums text-text-1">
          {formatCurrencyShort(totalSaved)}
          <span className="text-text-3">/{formatCurrencyShort(totalTarget)}</span>
        </span>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-24 bg-bg-hover animate-pulse" />
                <div className="h-0.5 w-full bg-bg-hover animate-pulse" />
              </div>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <p className="font-mono text-xs text-text-3 py-4">&gt; no savings goals</p>
        ) : (
          <div className="space-y-3">
            {/* Overall */}
            <div>
              <div className="mb-1 flex items-baseline justify-between font-mono text-[11px] tabular-nums">
                <span className="caption text-text-2">OVERALL</span>
                <span className="text-text-1">{Math.round(overallPct)}%</span>
              </div>
              <HairlineProgress value={overallPct} tone="accent" height={2} />
            </div>

            {goals.map((goal) => {
              const pct =
                Number(goal.target_amount) > 0
                  ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
                  : 0
              return (
                <div key={goal.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 font-mono text-[11px] tabular-nums">
                    <span className="truncate text-text-2 uppercase tracking-[0.04em]">{goal.name}</span>
                    <span className="text-text-3 shrink-0">
                      <span className="text-text-1">{formatCurrencyShort(Number(goal.current_amount))}</span>
                      /{formatCurrencyShort(Number(goal.target_amount))}
                    </span>
                  </div>
                  <HairlineProgress value={pct} tone="neutral" height={2} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
