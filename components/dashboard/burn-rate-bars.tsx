'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentMonthKey, formatCurrencyShort } from '@/lib/utils'
import type { BudgetEntry } from '@/types'
import { useIncome } from '@/lib/hooks/use-income'
import { HairlineProgress } from '@/components/data/hairline-progress'

interface CategorySpend {
  category: string
  amount: number
}

function tone(pct: number): 'danger' | 'warn' | 'success' {
  if (pct > 40) return 'danger'
  if (pct > 20) return 'warn'
  return 'success'
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
          grouped[entry.category] = (grouped[entry.category] ?? 0) + Number(entry.amount_gbp)
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
    <section className="border border-border bg-bg-elevated">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="caption text-text-2">BURN_RATE</span>
        <span className="caption text-text-3">{categories.length} CATEGORIES</span>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 bg-bg-hover animate-pulse" />
                <div className="h-0.5 w-full bg-bg-hover animate-pulse" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="font-mono text-xs text-text-3 py-4">&gt; no spending logged this month</p>
        ) : (
          <ul className="space-y-3">
            {categories.map(({ category, amount }) => {
              const pct = Math.min(100, (amount / income) * 100)
              return (
                <li key={category}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="caption text-text-2">{category.toUpperCase()}</span>
                    <span className="font-mono text-[12px] tabular-nums text-text-1">
                      {formatCurrencyShort(amount)}
                      <span className="ml-2 text-text-3">{pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <HairlineProgress value={pct} tone={tone(pct)} height={2} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
