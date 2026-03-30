import { FitnessClient } from '@/components/fitness/fitness-client'

export const dynamic = 'force-dynamic'

export default function FitnessPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-tight">Fitness Tracker</h2>
        <p className="text-sm text-muted-foreground">Weight, nutrition, and progress</p>
      </div>
      <FitnessClient />
    </div>
  )
}
