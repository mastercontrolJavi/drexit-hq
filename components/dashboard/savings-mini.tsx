'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrencyShort } from '@/lib/utils'
import type { SavingsGoal } from '@/types'
import { HairlineProgress } from '@/components/data/hairline-progress'
import { LoadError } from '@/components/data/load-error'
import { SkeletonBarRows } from '@/components/data/skeleton'
import { Panel } from '@/components/data/panel'
import { EmptyState } from '@/components/data/empty-state'

export function SavingsMini() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: true })
    if (error || !data) {
      setFailed(true)
      setLoading(false)
      return
    }
    setGoals(data as SavingsGoal[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0)
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0)
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  return (
    <Panel>
      <Panel.Header>
        <Panel.Title>SAVINGS</Panel.Title>
        <span className="font-mono text-[12px] tabular-nums text-text-1">
          {formatCurrencyShort(totalSaved)}
          <span className="text-text-3">/{formatCurrencyShort(totalTarget)}</span>
        </span>
      </Panel.Header>

      <div className="p-4">
        {loading ? (
          <SkeletonBarRows count={3} />
        ) : failed ? (
          <LoadError onRetry={fetchGoals} />
        ) : goals.length === 0 ? (
          <EmptyState>no savings goals</EmptyState>
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
                    <span className="truncate text-text-2 uppercase tracking-[0.04em]" title={goal.name}>
                      {goal.name}
                    </span>
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
    </Panel>
  )
}
