import { GoalsClient } from '@/components/goals/goals-client'

export const dynamic = 'force-dynamic'

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            GOALS &amp; TIMELINE
          </h1>
          <p className="num-display mt-1 text-[18px] md:text-[28px] leading-tight text-text-1">
            OBJECTIVES
          </p>
        </div>
      </div>
      <GoalsClient />
    </div>
  )
}
