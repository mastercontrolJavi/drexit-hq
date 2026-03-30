import { format } from 'date-fns'
import { StatCards } from '@/components/dashboard/stat-cards'
import { TodoList } from '@/components/dashboard/todo-list'
import { BurnRateBars } from '@/components/dashboard/burn-rate-bars'
import { MiniWeightChart } from '@/components/dashboard/mini-weight-chart'
import { WeeklyFocus } from '@/components/dashboard/weekly-focus'
import { CashFlowMini } from '@/components/dashboard/cash-flow-mini'
import { SavingsMini } from '@/components/dashboard/savings-mini'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const today = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily HQ</h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
      </div>

      <StatCards />

      <div className="grid gap-6 md:grid-cols-3">
        <TodoList />
        <BurnRateBars />
        <MiniWeightChart />
      </div>

      {/* Financial Overview */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Financial Overview</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <CashFlowMini />
          <SavingsMini />
        </div>
      </div>

      <WeeklyFocus />
    </div>
  )
}
