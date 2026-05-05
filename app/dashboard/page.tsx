import { format } from 'date-fns'
import { StatCards } from '@/components/dashboard/stat-cards'
import { TodoList } from '@/components/dashboard/todo-list'
import { NonNegotiables } from '@/components/dashboard/non-negotiables'
import { BurnRateBars } from '@/components/dashboard/burn-rate-bars'
import { MiniWeightChart } from '@/components/dashboard/mini-weight-chart'
import { WeeklyFocus } from '@/components/dashboard/weekly-focus'
import { CashFlowMini } from '@/components/dashboard/cash-flow-mini'
import { SavingsMini } from '@/components/dashboard/savings-mini'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const today = format(new Date(), 'EEEE · MMM d · yyyy').toUpperCase()

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            DAILY_HQ
          </h1>
          <p className="num-display mt-1 text-[28px] leading-tight text-text-1">
            {today}
          </p>
        </div>
        <div className="caption text-text-3 hidden md:block">
          PRESS &nbsp;
          <span className="border border-border px-1.5 py-0.5 text-text-2">⌘K</span>
          &nbsp; FOR COMMANDS
        </div>
      </div>

      {/* Stat strip */}
      <StatCards />

      {/* Daily actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <NonNegotiables />
        <TodoList />
      </div>

      {/* Trends */}
      <div className="grid gap-4 md:grid-cols-2">
        <BurnRateBars />
        <MiniWeightChart />
      </div>

      {/* Financial overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <CashFlowMini />
        <SavingsMini />
      </div>

      {/* Focus */}
      <WeeklyFocus />
    </div>
  )
}
