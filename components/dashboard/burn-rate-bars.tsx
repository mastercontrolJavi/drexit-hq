'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { getCurrentMonthKey, formatCurrencyShort } from '@/lib/utils'
import type { BudgetEntry } from '@/types'
import { useIncome } from '@/lib/hooks/use-income'

interface CategorySpend {
  category: string
  amount: number
}

function barColor(pct: number): string {
  if (pct > 40) return 'bg-ios-red'
  if (pct > 20) return 'bg-ios-orange'
  return 'bg-ios-green'
}

export function BurnRateBars() {
  const { income } = useIncome()
  const [categories, setCategories] = useState<CategorySpend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBudget() {
      const monthKey = getCurrentMonthKey()

      const { data, error } = await supabase
        .from('budget_entries')
        .select('category, amount_gbp')
        .eq('month_key', monthKey)

      if (!error && data) {
        const grouped: Record<string, number> = {}
        for (const entry of data as Pick<BudgetEntry, 'category' | 'amount_gbp'>[]) {
          grouped[entry.category] = (grouped[entry.category] ?? 0) + entry.amount_gbp
        }

        const sorted = Object.entries(grouped)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)

        setCategories(sorted)
      }
      setLoading(false)
    }

    fetchBudget()
  }, [])

  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Budget Burn Rate
        </p>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No spending logged this month.
          </p>
        ) : (
          <div className="space-y-4">
            {categories.map(({ category, amount }) => {
              const pct = Math.min(100, (amount / income) * 100)
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{category}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrencyShort(amount)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-ios-gray-5">
                    <div
                      className={`h-2 rounded-full ${barColor(pct)} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
