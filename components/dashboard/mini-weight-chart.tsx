'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from 'recharts'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { USER_STATS } from '@/types'
import type { WeighIn } from '@/types'

interface ChartPoint {
  date: string
  label: string
  weight: number
}

interface TooltipPayload {
  payload: ChartPoint
  value: number
}

function MonoTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]
  return (
    <div className="border border-border-strong bg-bg-elevated px-2.5 py-1.5 font-mono text-[11px] tabular-nums">
      <div className="text-text-1">{p.value} LBS</div>
      <div className="text-text-3">{p.payload.label.toUpperCase()}</div>
    </div>
  )
}

export function MiniWeightChart() {
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWeighIns() {
      const { data: rows, error } = await supabase
        .from('weigh_ins')
        .select('date, weight_lbs')
        .order('date', { ascending: true })
        .limit(8)

      if (!error && rows) {
        const points = (rows as Pick<WeighIn, 'date' | 'weight_lbs'>[]).map((r) => ({
          date: r.date,
          label: format(new Date(r.date), 'MMM d'),
          weight: Number(r.weight_lbs),
        }))
        setData(points)
      }
      setLoading(false)
    }
    fetchWeighIns()
  }, [])

  const latest = data.length > 0 ? data[data.length - 1].weight : null
  const first = data.length > 0 ? data[0].weight : null
  const delta = latest !== null && first !== null ? latest - first : null

  return (
    <section className="border border-border bg-bg-elevated">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="caption text-text-2">WEIGHT_PROGRESS</span>
        <span className="font-mono text-[11px] tabular-nums text-text-3">
          TARGET {USER_STATS.goalWeight} LBS
        </span>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="h-[180px] md:h-[200px] w-full animate-pulse bg-bg-hover" />
        ) : data.length === 0 ? (
          <p className="font-mono text-xs text-text-3 py-4">&gt; no weigh-ins yet</p>
        ) : (
          <>
            <div className="h-[180px] md:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  ticks={data.length > 1 ? [data[0].label, data[data.length - 1].label] : [data[0].label]}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={['dataMin - 3', 'dataMax + 3']}
                  tick={{ fontSize: 10, fill: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  tickCount={2}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                  content={<MonoTooltip />}
                />
                <ReferenceLine
                  y={USER_STATS.goalWeight}
                  stroke="var(--success)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--text-1)"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: 'var(--text-1)', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>

            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2 font-mono text-[11px] tabular-nums">
              <span className="text-text-3">
                LATEST <span className="text-text-1">{latest} LBS</span>
              </span>
              {delta !== null && (
                <span className={delta < 0 ? 'text-success' : delta > 0 ? 'text-danger' : 'text-text-3'}>
                  Δ {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
