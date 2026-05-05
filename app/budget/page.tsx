import { BudgetTabs } from '@/components/budget/budget-tabs'

export const dynamic = 'force-dynamic'

export default function BudgetPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            BUDGET &amp; FINANCE
          </h1>
          <p className="num-display mt-1 text-[28px] leading-tight text-text-1">
            CASH FLOW
          </p>
        </div>
      </div>

      <BudgetTabs />
    </div>
  )
}
