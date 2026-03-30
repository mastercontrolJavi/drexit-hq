'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrencyShort } from '@/lib/utils'
import { SavingsGoal } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { PiggyBank } from 'lucide-react'

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

  if (loading) {
    return <Skeleton className="h-[200px] rounded-xl" />
  }

  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0)
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0)
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  return (
    <Card className="shadow-card border-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-ios-purple" />
            Savings Progress
          </span>
          <span className="text-lg font-bold text-ios-purple">
            {formatCurrencyShort(totalSaved)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No savings goals</p>
        ) : (
          <>
            {/* Overall progress */}
            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>Overall</span>
                <span>{Math.round(overallPct)}%</span>
              </div>
              <Progress value={Math.min(100, overallPct)} className="h-2" />
            </div>
            {/* Individual goals */}
            {goals.map((goal) => {
              const pct =
                Number(goal.target_amount) > 0
                  ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
                  : 0
              return (
                <div key={goal.id}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground truncate mr-2">{goal.name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {formatCurrencyShort(Number(goal.current_amount))} / {formatCurrencyShort(Number(goal.target_amount))}
                    </span>
                  </div>
                  <Progress value={Math.min(100, pct)} className="h-1.5" />
                </div>
              )
            })}
          </>
        )}
      </CardContent>
    </Card>
  )
}
