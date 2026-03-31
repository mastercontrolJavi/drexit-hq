'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Wallet, Scale, ListChecks } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { daysUntilDrexit, getCurrentMonthKey, formatCurrencyShort } from '@/lib/utils'
import { USER_STATS } from '@/types'
import type { BudgetEntry, WeighIn } from '@/types'
import { useIncome } from '@/lib/hooks/use-income'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  dotColor: string
}

function StatCard({ label, value, icon, color, dotColor }: StatCardProps) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-1.5 mb-4">
          <span className={color}>{icon}</span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="text-center">
          <p className="text-[48px] font-bold leading-none tracking-tight">{value}</p>
          <div className="flex justify-center mt-3">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-1.5 mb-4">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex flex-col items-center">
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-1.5 w-1.5 rounded-full mt-3" />
        </div>
      </CardContent>
    </Card>
  )
}

export function StatCards() {
  const { income } = useIncome()
  const [loading, setLoading] = useState(true)
  const [runway, setRunway] = useState(0)
  const [lbsToGoal, setLbsToGoal] = useState(0)
  const [openTodos, setOpenTodos] = useState(0)

  useEffect(() => {
    async function fetchStats() {
      const monthKey = getCurrentMonthKey()

      const [budgetRes, weighInRes, todoRes] = await Promise.all([
        supabase
          .from('budget_entries')
          .select('amount_gbp')
          .eq('month_key', monthKey),
        supabase
          .from('weigh_ins')
          .select('weight_lbs')
          .order('date', { ascending: false })
          .limit(1),
        supabase
          .from('todos')
          .select('id', { count: 'exact', head: true })
          .eq('completed', false),
      ])

      const totalSpent = (budgetRes.data as Pick<BudgetEntry, 'amount_gbp'>[] | null)
        ?.reduce((sum, e) => sum + e.amount_gbp, 0) ?? 0
      setRunway(income - totalSpent)

      const latestWeight = (weighInRes.data as Pick<WeighIn, 'weight_lbs'>[] | null)?.[0]?.weight_lbs
      const currentWeight = latestWeight ?? USER_STATS.currentWeight
      setLbsToGoal(Math.round(currentWeight - USER_STATS.goalWeight))

      setOpenTodos(todoRes.count ?? 0)
      setLoading(false)
    }

    fetchStats()
  }, [income])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  const drexitDays = daysUntilDrexit()

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard
        label="Days to DREXIT"
        value={String(drexitDays)}
        icon={<Calendar className="h-4 w-4" />}
        color="text-ios-blue"
        dotColor="bg-ios-blue"
      />
      <StatCard
        label="Monthly Runway"
        value={formatCurrencyShort(runway)}
        icon={<Wallet className="h-4 w-4" />}
        color={runway >= 0 ? 'text-ios-green' : 'text-ios-red'}
        dotColor={runway >= 0 ? 'bg-ios-green' : 'bg-ios-red'}
      />
      <StatCard
        label="Lbs to Goal"
        value={String(lbsToGoal)}
        icon={<Scale className="h-4 w-4" />}
        color="text-ios-orange"
        dotColor="bg-ios-orange"
      />
      <StatCard
        label="Open Todos"
        value={String(openTodos)}
        icon={<ListChecks className="h-4 w-4" />}
        color="text-ios-purple"
        dotColor="bg-ios-purple"
      />
    </div>
  )
}
