import { KanbanBoard } from '@/components/business/kanban-board'

export const dynamic = 'force-dynamic'

export default function BusinessPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            BUSINESS IDEAS
          </h1>
          <p className="num-display mt-1 text-[28px] leading-tight text-text-1">
            PIPELINE
          </p>
        </div>
      </div>
      <KanbanBoard />
    </div>
  )
}
