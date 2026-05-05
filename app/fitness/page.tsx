import { FitnessClient } from '@/components/fitness/fitness-client'

export const dynamic = 'force-dynamic'

export default function FitnessPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            FITNESS TRACKER
          </h1>
          <p className="num-display mt-1 text-[28px] leading-tight text-text-1">
            BODY COMPOSITION
          </p>
        </div>
      </div>
      <FitnessClient />
    </div>
  )
}
