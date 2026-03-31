import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BudgetClient } from '@/components/budget/budget-client'
import { SpendingOverview } from '@/components/budget/spending-overview'
import { BudgetLimits } from '@/components/budget/budget-limits'
import { RecurringTracker } from '@/components/budget/recurring-tracker'
import { SpendingInsights } from '@/components/budget/spending-insights'

export const dynamic = 'force-dynamic'

export default function BudgetPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[28px] font-bold tracking-tight">Budget & Finance</h2>
        <p className="text-sm text-muted-foreground">Track spending, limits, and financial patterns</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap gap-1 bg-ios-gray-6 rounded-xl p-1 mb-8 h-auto">
          <TabsTrigger value="overview" className="rounded-lg text-xs data-[state=active]:shadow-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="spending" className="rounded-lg text-xs data-[state=active]:shadow-sm">
            Spending
          </TabsTrigger>
          <TabsTrigger value="budgets" className="rounded-lg text-xs data-[state=active]:shadow-sm">
            Budgets
          </TabsTrigger>
          <TabsTrigger value="recurring" className="rounded-lg text-xs data-[state=active]:shadow-sm">
            Recurring
          </TabsTrigger>
          <TabsTrigger value="insights" className="rounded-lg text-xs data-[state=active]:shadow-sm">
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <BudgetClient />
        </TabsContent>

        <TabsContent value="spending">
          <SpendingOverview />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetLimits />
        </TabsContent>

        <TabsContent value="recurring">
          <RecurringTracker />
        </TabsContent>

        <TabsContent value="insights">
          <SpendingInsights />
        </TabsContent>
      </Tabs>
    </div>
  )
}
