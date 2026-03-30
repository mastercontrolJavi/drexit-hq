import { BudgetClient } from '@/components/budget/budget-client'

export const dynamic = 'force-dynamic'

export default function BudgetPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-tight">Monthly Budget</h2>
        <p className="text-sm text-muted-foreground">Track spending and savings</p>
      </div>
      <BudgetClient />
    </div>
  )
}
