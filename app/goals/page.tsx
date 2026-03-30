import { GoalsClient } from '@/components/goals/goals-client'

export const dynamic = 'force-dynamic'

export default function GoalsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Goals &amp; Timeline</h1>
      </div>

      <GoalsClient />
    </div>
  )
}
