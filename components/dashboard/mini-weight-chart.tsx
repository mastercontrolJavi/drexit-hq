'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart,
  Area,
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
          weight: r.weight_lbs,
        }))
        setData(points)
      }
      setLoading(false)
    }

    fetchWeighIns()
  }, [])

  const latestWeight = data.length > 0 ? data[data.length - 1].weight : null

  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Weight Progress
        </p>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No weigh-ins yet.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="15%" stopColor="#FF9500" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#FF9500" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#8E8E93' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={['dataMin - 5', 'dataMax + 5']}
                  tick={{ fontSize: 11, fill: '#8E8E93' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #E5E5EA',
                    borderRadius: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    fontSize: 13,
                  }}
                  formatter={(value) => [`${value} lbs`, 'Weight']}
                />
                <ReferenceLine
                  y={USER_STATS.goalWeight}
                  stroke="#34C759"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#FF9500"
                  strokeWidth={2}
                  fill="url(#weightGradient)"
                  dot={{ r: 3, fill: '#FF9500', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#FF9500', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>
                Latest:{' '}
                <span className="font-semibold text-foreground">
                  {latestWeight} lbs
                </span>
              </span>
              <span>
                Target:{' '}
                <span className="font-semibold text-ios-green">
                  {USER_STATS.goalWeight} lbs
                </span>
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
