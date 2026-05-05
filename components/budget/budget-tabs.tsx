'use client'

import { useState } from 'react'
import { BudgetClient } from '@/components/budget/budget-client'
import { SpendingOverview } from '@/components/budget/spending-overview'
import { BudgetLimits } from '@/components/budget/budget-limits'
import { RecurringTracker } from '@/components/budget/recurring-tracker'
import { SpendingInsights } from '@/components/budget/spending-insights'
import { UnderlineTabs } from '@/components/data/underline-tabs'

type Tab = 'overview' | 'spending' | 'budgets' | 'recurring' | 'insights'

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview',  label: 'OVERVIEW' },
  { value: 'spending',  label: 'SPENDING' },
  { value: 'budgets',   label: 'BUDGETS' },
  { value: 'recurring', label: 'RECURRING' },
  { value: 'insights',  label: 'INSIGHTS' },
]

export function BudgetTabs() {
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <>
      <UnderlineTabs<Tab> options={TABS} value={tab} onChange={setTab} />
      <div role="tabpanel" className="pt-2">
        {tab === 'overview'  && <BudgetClient />}
        {tab === 'spending'  && <SpendingOverview />}
        {tab === 'budgets'   && <BudgetLimits />}
        {tab === 'recurring' && <RecurringTracker />}
        {tab === 'insights'  && <SpendingInsights />}
      </div>
    </>
  )
}
