'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getCurrentMonthKey, formatCurrencyShort } from '@/lib/utils'
import type { BudgetEntry } from '@/types'
import { useIncome } from '@/lib/hooks/use-income'
import { HairlineProgress } from '@/components/data/hairline-progress'
import { LoadError } from '@/components/data/load-error'
import { SkeletonBarRows } from '@/components/data/skeleton'
import { listContainer, listItem } from '@/lib/motion'
import { Panel } from '@/components/data/panel'
import { EmptyState } from '@/components/data/empty-state'

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
  const [failed, setFailed] = useState(false)

  const fetchBudget = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    const monthKey = getCurrentMonthKey()
    const { data, error } = await supabase
      .from('budget_entries')
      .select('category, amount_gbp')
      .eq('month_key', monthKey)

    if (error || !data) {
      setFailed(true)
      setLoading(false)
      return
    }

    const grouped: Record<string, number> = {}
    for (const entry of data as Pick<BudgetEntry, 'category' | 'amount_gbp'>[]) {
      grouped[entry.category] = (grouped[entry.category] ?? 0) + Number(entry.amount_gbp)
    }
    const sorted = Object.entries(grouped)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
    setCategories(sorted)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBudget()
  }, [fetchBudget])

  return (
    <Panel>
      <Panel.Header>
        <Panel.Title>BURN_RATE</Panel.Title>
        <span className="caption text-text-3">{categories.length} CATEGORIES</span>
      </Panel.Header>

      <div className="p-4">
        {loading ? (
          <SkeletonBarRows count={4} />
        ) : failed ? (
          <LoadError onRetry={fetchBudget} />
        ) : categories.length === 0 ? (
          <EmptyState>no spending logged this month</EmptyState>
        ) : (
          <motion.ul
            className="space-y-3"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {categories.map(({ category, amount }) => {
              const pct = Math.min(100, (amount / income) * 100)
              return (
                <motion.li key={category} variants={listItem}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="caption text-text-2">{category.toUpperCase()}</span>
                    <span className="font-mono text-[12px] tabular-nums text-text-1">
                      {formatCurrencyShort(amount)}
                      <span className="ml-2 text-text-3">{pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <HairlineProgress value={pct} tone={tone(pct)} height={2} />
                </motion.li>
              )
            })}
          </motion.ul>
        )}
      </div>
    </Panel>
  )
}
