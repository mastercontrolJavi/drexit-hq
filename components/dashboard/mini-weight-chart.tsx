'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { LoadError } from '@/components/data/load-error'
import { CHART_ANIMATION } from '@/lib/motion'
import { SkeletonLineChart } from '@/components/data/skeleton'
import { Panel } from '@/components/data/panel'
import { EmptyState } from '@/components/data/empty-state'

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
  const [failed, setFailed] = useState(false)

  const fetchWeighIns = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    // Newest first then reversed: ascending + limit returns the oldest rows,
    // which left this chart showing the first eight weigh-ins forever.
    const { data: rows, error } = await supabase
      .from('weigh_ins')
      .select('date, weight_lbs')
      .order('date', { ascending: false })
      .limit(10)

    if (error || !rows) {
      setFailed(true)
      setLoading(false)
      return
    }

    setData(
      [...(rows as Pick<WeighIn, 'date' | 'weight_lbs'>[])].reverse().map((r) => ({
        date: r.date,
        label: format(new Date(r.date), 'MMM d'),
        weight: Number(r.weight_lbs),
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchWeighIns()
  }, [fetchWeighIns])

  const latest = data.length > 0 ? data[data.length - 1].weight : null
  const first = data.length > 0 ? data[0].weight : null
  const delta = latest !== null && first !== null ? latest - first : null

  return (
    <Panel>
      <Panel.Header>
        <Panel.Title>WEIGHT_PROGRESS</Panel.Title>
        <span className="font-mono text-[11px] tabular-nums text-text-3">
          TARGET {USER_STATS.goalWeight} LBS
        </span>
      </Panel.Header>

      <div className="p-4">
        {loading ? (
          <SkeletonLineChart className="h-[180px] md:h-[200px]" />
        ) : failed ? (
          <LoadError onRetry={fetchWeighIns} />
        ) : data.length === 0 ? (
          <EmptyState>no weigh-ins yet</EmptyState>
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
                <Line {...CHART_ANIMATION}
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--text-1)"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: 'var(--text-1)', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
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
    </Panel>
  )
}
