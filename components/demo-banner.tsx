const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export function DemoBanner() {
  if (!isDemoMode) return null
  return (
    <div className="border-b border-border py-1 text-center font-mono text-[11px] text-text-3">
      DEMO MODE · Sample data only · Read-only fixture data
    </div>
  )
}
