import { KanbanBoard } from '@/components/business/kanban-board'

export const dynamic = 'force-dynamic'

export default function BusinessPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Business Ideas</h1>
      </div>

      <KanbanBoard />
    </div>
  )
}
