'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import {
  calculateTargetWeight,
  cn,
  formatDateShort,
  getUserMacros,
} from '@/lib/utils'
import {
  DREXIT_DATE,
  FOOD_CATEGORIES,
  type FoodItem,
  USER_STATS,
  WEIGHT_START_DATE,
  type WeighIn,
} from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RingProgress } from '@/components/data/ring-progress'
import {
  UnderlineTabs,
  type UnderlineTabOption,
} from '@/components/data/underline-tabs'

const tickStyle = {
  fontSize: 10,
  fill: 'var(--text-3)',
  fontFamily: 'var(--font-mono)',
}

interface MonoTooltipPayload {
  name?: string | number
  dataKey?: string | number
  value?: number | string
  color?: string
}

function MonoTooltip({
  active,
  payload,
  label,
  unit = '',
}: {
  active?: boolean
  payload?: MonoTooltipPayload[]
  label?: string | number
  unit?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="border border-border-strong bg-bg-elevated px-2.5 py-1.5 font-mono text-[11px] tabular-nums">
      {label !== undefined && <div className="caption text-text-3">{String(label).toUpperCase()}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-text-1">
          {p.color && <span style={{ background: p.color }} className="inline-block h-2 w-2" />}
          <span className="text-text-3">{String(p.name ?? p.dataKey).toUpperCase()}</span>
          <span>
            {Number(p.value).toFixed(1)}
            {unit}
          </span>
        </div>
      ))}
    </div>
  )
}

const FOOD_CATEGORY_TONE: Record<string, string> = {
  Protein: 'text-accent',
  Carb:    'text-warn',
  Fat:     'text-text-2',
  Veg:     'text-success',
  Other:   'text-text-3',
}

function getBmiCategory(bmi: number): { label: string; tone: 'success' | 'warn' | 'danger' } {
  if (bmi < 18.5) return { label: 'UNDERWEIGHT', tone: 'warn' }
  if (bmi < 25) return { label: 'NORMAL', tone: 'success' }
  if (bmi < 30) return { label: 'OVERWEIGHT', tone: 'warn' }
  return { label: 'OBESE', tone: 'danger' }
}

const TONE_TEXT = {
  success: 'text-success',
  warn:    'text-warn',
  danger:  'text-danger',
} as const

function calcStreak(weighIns: WeighIn[]): number {
  if (weighIns.length === 0) return 0
  const sorted = [...weighIns].sort((a, b) => b.date.localeCompare(a.date))
  const today = format(new Date(), 'yyyy-MM-dd')
  // Streak only counts if the last log was today or yesterday
  const latest = sorted[0].date
  const gap = differenceInCalendarDays(parseISO(today), parseISO(latest))
  if (gap > 1) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const dayGap = differenceInCalendarDays(parseISO(sorted[i - 1].date), parseISO(sorted[i].date))
    if (dayGap === 1) streak++
    else break
  }
  return streak
}

type CompTab = 'bmi' | 'bodyfat' | 'overview'

export function FitnessClient() {
  const [weighIns, setWeighIns] = useState<WeighIn[]>([])
  const [foods, setFoods] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [foodDrawerOpen, setFoodDrawerOpen] = useState(false)
  const [compTab, setCompTab] = useState<CompTab>('bmi')

  const [wiDate, setWiDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [wiWeight, setWiWeight] = useState('')
  const [wiBmi, setWiBmi] = useState('')
  const [wiBodyFat, setWiBodyFat] = useState('')
  const [wiNote, setWiNote] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editBmi, setEditBmi] = useState('')
  const [editBodyFat, setEditBodyFat] = useState('')
  const [editNote, setEditNote] = useState('')

  const [foodName, setFoodName] = useState('')
  const [foodCategory, setFoodCategory] = useState<string>('')
  const [foodNotes, setFoodNotes] = useState('')

  const macros = getUserMacros()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [weighInRes, foodRes] = await Promise.all([
      supabase.from('weigh_ins').select('*').order('date', { ascending: true }),
      supabase.from('food_items').select('*').order('created_at', { ascending: false }),
    ])
    setWeighIns((weighInRes.data as WeighIn[]) || [])
    setFoods((foodRes.data as FoodItem[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const chartData = weighIns.map((w) => ({
    date: formatDateShort(w.date),
    weight: Number(w.weight_lbs),
    target: calculateTargetWeight(
      USER_STATS.currentWeight,
      USER_STATS.goalWeight,
      WEIGHT_START_DATE,
      DREXIT_DATE,
      new Date(w.date),
    ),
  }))

  const bmiChartData = weighIns
    .filter((w) => w.bmi !== null)
    .map((w) => ({
      date: formatDateShort(w.date),
      bmi: Number(w.bmi),
    }))

  const bodyFatChartData = weighIns
    .filter((w) => w.body_fat_pct !== null)
    .map((w) => ({
      date: formatDateShort(w.date),
      bodyFat: Number(w.body_fat_pct),
    }))

  const compositionData = weighIns
    .filter((w) => w.bmi !== null || w.body_fat_pct !== null)
    .map((w) => ({
      date: formatDateShort(w.date),
      weight: Number(w.weight_lbs),
      bmi: w.bmi !== null ? Number(w.bmi) : undefined,
      bodyFat: w.body_fat_pct !== null ? Number(w.body_fat_pct) : undefined,
    }))

  const latest = weighIns.length > 0 ? weighIns[weighIns.length - 1] : null
  const latestWeight = latest ? Number(latest.weight_lbs) : null
  const latestBmi = latest && latest.bmi !== null ? Number(latest.bmi) : null

  // BMI Δ vs ~7 days ago
  const oneWeekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')
  const weekAgoEntry = [...weighIns]
    .reverse()
    .find((w) => w.date <= oneWeekAgo && w.bmi !== null)
  const bmiDelta =
    latestBmi !== null && weekAgoEntry?.bmi != null
      ? latestBmi - Number(weekAgoEntry.bmi)
      : null

  const latestTarget = latestWeight
    ? calculateTargetWeight(USER_STATS.currentWeight, USER_STATS.goalWeight, WEIGHT_START_DATE, DREXIT_DATE)
    : null
  const isOnTrack = latestWeight && latestTarget ? latestWeight <= latestTarget : null

  const streak = calcStreak(weighIns)

  async function handleLogWeight(e: React.FormEvent) {
    e.preventDefault()
    if (!wiWeight) {
      toast.error('Enter a weight')
      return
    }
    const { error } = await supabase.from('weigh_ins').upsert(
      {
        date: wiDate,
        weight_lbs: parseFloat(wiWeight),
        bmi: wiBmi ? parseFloat(wiBmi) : null,
        body_fat_pct: wiBodyFat ? parseFloat(wiBodyFat) : null,
        note: wiNote || null,
      },
      { onConflict: 'date' },
    )
    if (error) {
      toast.error('Failed to log weight')
      return
    }
    toast.success('Weight logged')
    setWiWeight('')
    setWiBmi('')
    setWiBodyFat('')
    setWiNote('')
    fetchData()
  }

  function startEdit(w: WeighIn) {
    setEditingId(w.id)
    setEditWeight(Number(w.weight_lbs).toString())
    setEditBmi(w.bmi !== null ? Number(w.bmi).toString() : '')
    setEditBodyFat(w.body_fat_pct !== null ? Number(w.body_fat_pct).toString() : '')
    setEditNote(w.note || '')
  }

  async function saveEdit(w: WeighIn) {
    if (!editWeight) {
      toast.error('Weight is required')
      return
    }
    const { error } = await supabase
      .from('weigh_ins')
      .update({
        weight_lbs: parseFloat(editWeight),
        bmi: editBmi ? parseFloat(editBmi) : null,
        body_fat_pct: editBodyFat ? parseFloat(editBodyFat) : null,
        note: editNote || null,
      })
      .eq('id', w.id)

    if (error) {
      toast.error('Failed to update')
      return
    }
    toast.success('Entry updated')
    setEditingId(null)
    fetchData()
  }

  async function handleDeleteWeighIn(id: string) {
    const { error } = await supabase.from('weigh_ins').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete')
      return
    }
    toast.success('Entry deleted')
    setWeighIns(weighIns.filter((w) => w.id !== id))
  }

  async function handleAddFood(e: React.FormEvent) {
    e.preventDefault()
    if (!foodName || !foodCategory) {
      toast.error('Name and category required')
      return
    }
    const { error } = await supabase.from('food_items').insert({
      name: foodName,
      category: foodCategory,
      notes: foodNotes || null,
    })
    if (error) {
      toast.error('Failed to add food')
      return
    }
    toast.success('Food added')
    setFoodName('')
    setFoodCategory('')
    setFoodNotes('')
    setFoodDrawerOpen(false)
    fetchData()
  }

  async function handleDeleteFood(id: string) {
    const { error } = await supabase.from('food_items').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete')
      return
    }
    toast.success('Food removed')
    setFoods(foods.filter((f) => f.id !== id))
  }

  // Macro split by calories: protein 4cal/g, carb 4cal/g, fat 9cal/g
  const proteinCal = macros.protein * 4
  const fatCal = macros.fat * 9
  const carbCal = macros.carbs * 4

  const macroCells: {
    label: string
    value: number
    suffix: string
    tone: 'accent' | 'success' | 'warn' | 'danger'
    pct: number
  }[] = [
    { label: 'CALORIES', value: macros.calories, suffix: 'KCAL', tone: 'accent',  pct: 100 },
    { label: 'PROTEIN',  value: macros.protein,  suffix: 'G',    tone: 'accent',  pct: macros.calories > 0 ? (proteinCal / macros.calories) * 100 : 0 },
    { label: 'FAT',      value: macros.fat,      suffix: 'G',    tone: 'warn',    pct: macros.calories > 0 ? (fatCal / macros.calories) * 100 : 0 },
    { label: 'CARBS',    value: macros.carbs,    suffix: 'G',    tone: 'success', pct: macros.calories > 0 ? (carbCal / macros.calories) * 100 : 0 },
  ]

  const compTabs: UnderlineTabOption<CompTab>[] = []
  if (bmiChartData.length > 0) compTabs.push({ value: 'bmi', label: 'BMI' })
  if (bodyFatChartData.length > 0) compTabs.push({ value: 'bodyfat', label: 'BODY_FAT' })
  if (compositionData.length > 0) compTabs.push({ value: 'overview', label: 'OVERVIEW' })

  return (
    <div className="space-y-6">
      {/* Macro strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-border bg-bg-elevated divide-x divide-border">
        {macroCells.map((cell) => (
          <div key={cell.label} className="flex items-center gap-4 px-5 py-4">
            <RingProgress value={cell.pct} max={100} size={48} strokeWidth={6} tone={cell.tone} />
            <div className="min-w-0">
              <span className="caption text-text-2">{cell.label}</span>
              <p className="num-display mt-0.5 text-[28px] leading-none text-text-1">
                {cell.value}
                <span className="ml-1 caption !text-text-3">{cell.suffix}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats strip — streak / BMI Δ / on-track */}
      <div className="grid grid-cols-3 border border-border bg-bg-elevated divide-x divide-border">
        <div className="px-5 py-4">
          <span className="caption text-text-2">STREAK</span>
          <p className="num-display mt-1 text-[28px] leading-none text-text-1">
            {streak}
            <span className="ml-1 caption !text-text-3">DAYS</span>
          </p>
        </div>
        <div className="px-5 py-4">
          <span className="caption text-text-2">BMI Δ · 7D</span>
          <p
            className={cn(
              'num-display mt-1 flex items-baseline gap-1.5 text-[28px] leading-none',
              bmiDelta === null
                ? 'text-text-3'
                : bmiDelta < 0
                ? 'text-success'
                : bmiDelta > 0
                ? 'text-danger'
                : 'text-text-1',
            )}
          >
            {bmiDelta === null ? (
              '—'
            ) : (
              <>
                {bmiDelta < 0 ? (
                  <ArrowDown className="h-4 w-4" strokeWidth={1.5} />
                ) : bmiDelta > 0 ? (
                  <ArrowUp className="h-4 w-4" strokeWidth={1.5} />
                ) : null}
                {Math.abs(bmiDelta).toFixed(2)}
              </>
            )}
          </p>
        </div>
        <div className="px-5 py-4">
          <span className="caption text-text-2">PACE</span>
          <p
            className={cn(
              'num-display mt-1 text-[28px] leading-none',
              isOnTrack === null ? 'text-text-3' : isOnTrack ? 'text-success' : 'text-warn',
            )}
          >
            {isOnTrack === null ? '—' : isOnTrack ? 'ON_TRACK' : 'BEHIND'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Log entry form */}
        <section className="border border-border bg-bg-elevated">
          <header className="border-b border-border px-4 py-2.5">
            <span className="caption text-text-2">LOG_ENTRY</span>
          </header>
          <form onSubmit={handleLogWeight} className="space-y-3 p-4">
            <label className="block space-y-1">
              <span className="caption text-text-2">DATE</span>
              <input
                type="date"
                value={wiDate}
                onChange={(e) => setWiDate(e.target.value)}
                className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] tabular-nums text-text-1 focus:border-text-2 focus:outline-none"
              />
            </label>
            <label className="block space-y-1">
              <span className="caption text-text-2">WEIGHT (LBS) *</span>
              <input
                type="number"
                step="0.1"
                value={wiWeight}
                onChange={(e) => setWiWeight(e.target.value)}
                placeholder="210.5"
                className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] tabular-nums text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="caption text-text-2">BMI</span>
                <input
                  type="number"
                  step="0.1"
                  value={wiBmi}
                  onChange={(e) => setWiBmi(e.target.value)}
                  placeholder="28.5"
                  className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] tabular-nums text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="caption text-text-2">BODY FAT %</span>
                <input
                  type="number"
                  step="0.1"
                  value={wiBodyFat}
                  onChange={(e) => setWiBodyFat(e.target.value)}
                  placeholder="22.0"
                  className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] tabular-nums text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="caption text-text-2">NOTE</span>
              <input
                value={wiNote}
                onChange={(e) => setWiNote(e.target.value)}
                placeholder="optional"
                className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="caption block w-full border border-text-1 bg-text-1 px-3 py-2 text-bg-base transition-colors duration-200 ease-out-200 hover:bg-bg-base hover:text-text-1"
            >
              LOG ENTRY
            </button>
          </form>
        </section>

        {/* Weight chart */}
        <section className="border border-border bg-bg-elevated lg:col-span-2">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="caption text-text-2">WEIGHT_PROGRESS</span>
            <span className="caption text-text-3">
              TARGET {USER_STATS.goalWeight} LBS
            </span>
          </header>
          <div className="p-4">
            {loading ? (
              <div className="h-[180px] md:h-[280px] w-full animate-pulse bg-bg-hover" />
            ) : chartData.length === 0 ? (
              <p className="font-mono text-xs text-text-3 py-12 text-center">
                &gt; no weigh-ins yet — log your first entry
              </p>
            ) : (
            <div className="h-[180px] md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    ticks={
                      chartData.length > 1
                        ? [chartData[0].date, chartData[chartData.length - 1].date]
                        : [chartData[0].date]
                    }
                  />
                  <YAxis
                    domain={['dataMin - 3', 'dataMax + 3']}
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickCount={2}
                  />
                  <Tooltip cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} content={<MonoTooltip unit=" lbs" />} />
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
                    name="weight"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="var(--text-3)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    name="target"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            )}
            {latestWeight && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 font-mono text-[11px] tabular-nums">
                <span className="text-text-3">
                  CURRENT <span className="text-text-1">{latestWeight} LBS</span>
                </span>
                <span className="text-text-3">
                  TARGET <span className="text-success">{USER_STATS.goalWeight} LBS</span>
                </span>
                <span className="text-text-3">
                  TO GO <span className="text-text-1">{(latestWeight - USER_STATS.goalWeight).toFixed(1)} LBS</span>
                </span>
                {latestBmi !== null && (
                  <span className="text-text-3">
                    BMI{' '}
                    <span className={TONE_TEXT[getBmiCategory(latestBmi).tone]}>
                      {latestBmi.toFixed(1)}
                    </span>
                    <span className="ml-1 text-text-3">{getBmiCategory(latestBmi).label}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Body composition */}
      {compTabs.length > 0 && (
        <section className="border border-border bg-bg-elevated">
          <header className="border-b border-border px-4 py-2.5">
            <span className="caption text-text-2">BODY_COMPOSITION</span>
          </header>
          <div className="px-4 pt-3">
            <UnderlineTabs<CompTab>
              options={compTabs}
              value={compTabs.find((t) => t.value === compTab) ? compTab : compTabs[0].value}
              onChange={setCompTab}
            />
          </div>
          <div className="p-4">
            {compTab === 'bmi' && bmiChartData.length > 0 && (
            <div className="h-[180px] md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bmiChartData} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} />
                  <YAxis
                    domain={['dataMin - 1', 'dataMax + 1']}
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} content={<MonoTooltip />} />
                  <defs>
                    <linearGradient id="bmiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <ReferenceLine y={18.5} stroke="var(--warn)" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={25} stroke="var(--success)" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={30} stroke="var(--danger)" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Area
                    type="monotone"
                    dataKey="bmi"
                    stroke="var(--accent)"
                    strokeWidth={1.5}
                    fill="url(#bmiGradient)"
                    dot={{ r: 2, fill: 'var(--accent)' }}
                    name="bmi"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            )}
            {compTab === 'bodyfat' && bodyFatChartData.length > 0 && (
            <div className="h-[180px] md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bodyFatChartData} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} />
                  <YAxis
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip cursor={{ stroke: 'var(--border-strong)' }} content={<MonoTooltip unit="%" />} />
                  <defs>
                    <linearGradient id="bfGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--text-1)" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="var(--text-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="bodyFat"
                    stroke="var(--text-1)"
                    strokeWidth={1.5}
                    fill="url(#bfGradient)"
                    dot={{ r: 2, fill: 'var(--text-1)' }}
                    name="body fat"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            )}
            {compTab === 'overview' && compositionData.length > 0 && (
            <div className="h-[180px] md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={compositionData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="weight" tick={tickStyle} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} width={40} />
                  <YAxis yAxisId="pct" orientation="right" tick={tickStyle} tickLine={false} axisLine={false} domain={[0, 'dataMax + 5']} width={32} />
                  <Tooltip cursor={{ stroke: 'var(--border-strong)' }} content={<MonoTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-3)' }} />
                  <Line yAxisId="weight" type="monotone" dataKey="weight" stroke="var(--text-1)" strokeWidth={1.5} dot={{ r: 2, fill: 'var(--text-1)' }} name="Weight" />
                  <Line yAxisId="pct" type="monotone" dataKey="bmi" stroke="var(--accent)" strokeWidth={1.5} dot={{ r: 2, fill: 'var(--accent)' }} name="BMI" />
                  <Line yAxisId="pct" type="monotone" dataKey="bodyFat" stroke="var(--warn)" strokeWidth={1.5} dot={{ r: 2, fill: 'var(--warn)' }} name="Body Fat" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            )}
          </div>
        </section>
      )}

      {/* Weigh-in history */}
      {weighIns.length > 0 && (
        <section className="border border-border bg-bg-elevated">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="caption text-text-2">HISTORY · {weighIns.length} ENTRIES</span>
          </header>
          <div className="overflow-x-auto">
          <div className="grid grid-cols-[100px_80px_60px_70px_60px_1fr_60px] gap-3 border-b border-border bg-bg-hover px-4 py-2 caption text-text-3 min-w-[620px]">
            <span>DATE</span>
            <span>WEIGHT</span>
            <span>BMI</span>
            <span>BODY %</span>
            <span>Δ</span>
            <span>NOTE</span>
            <span />
          </div>
          <ul className="min-w-[620px]">
            {[...weighIns].reverse().map((w, i, arr) => {
              const prev = arr[i + 1]
              const delta = prev ? Number(w.weight_lbs) - Number(prev.weight_lbs) : null
              const isEditing = editingId === w.id
              if (isEditing) {
                return (
                  <li
                    key={w.id}
                    className="grid grid-cols-[100px_80px_60px_70px_60px_1fr_60px] items-center gap-3 border-b border-border bg-bg-hover px-4 py-2 last:border-b-0"
                  >
                    <span className="font-mono text-[12px] tabular-nums text-text-2">
                      {format(parseISO(w.date), 'MMM dd').toUpperCase()}
                    </span>
                    <input
                      autoFocus
                      type="number"
                      step="0.1"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      className="border border-border bg-transparent px-1.5 py-1 font-mono text-[12px] tabular-nums text-text-1 focus:border-text-2 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={editBmi}
                      onChange={(e) => setEditBmi(e.target.value)}
                      placeholder="—"
                      className="border border-border bg-transparent px-1.5 py-1 font-mono text-[12px] tabular-nums text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={editBodyFat}
                      onChange={(e) => setEditBodyFat(e.target.value)}
                      placeholder="—"
                      className="border border-border bg-transparent px-1.5 py-1 font-mono text-[12px] tabular-nums text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
                    />
                    <span />
                    <input
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="note"
                      className="border border-border bg-transparent px-1.5 py-1 font-mono text-[12px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => saveEdit(w)} className="text-success hover:opacity-80" aria-label="Save">
                        <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-text-3 hover:text-text-1" aria-label="Cancel">
                        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </li>
                )
              }

              return (
                <li
                  key={w.id}
                  className="group grid grid-cols-[100px_80px_60px_70px_60px_1fr_60px] items-center gap-3 border-b border-border px-4 py-2 last:border-b-0 transition-colors duration-200 ease-out-200 hover:bg-bg-hover"
                >
                  <span className="font-mono text-[12px] tabular-nums text-text-2">
                    {format(parseISO(w.date), 'MMM dd').toUpperCase()}
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-text-1">
                    {Number(w.weight_lbs).toFixed(1)}
                  </span>
                  <span className="font-mono text-[12px] tabular-nums">
                    {w.bmi !== null ? (
                      <span className={TONE_TEXT[getBmiCategory(Number(w.bmi)).tone]}>
                        {Number(w.bmi).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-text-3">—</span>
                    )}
                  </span>
                  <span className="font-mono text-[12px] tabular-nums">
                    {w.body_fat_pct !== null ? (
                      <span className="text-text-1">{Number(w.body_fat_pct).toFixed(1)}%</span>
                    ) : (
                      <span className="text-text-3">—</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[12px] tabular-nums',
                      delta === null ? 'text-text-3' : delta < 0 ? 'text-success' : delta > 0 ? 'text-danger' : 'text-text-3',
                    )}
                  >
                    {delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}
                  </span>
                  <span className="truncate text-[12px] text-text-2">{w.note || '—'}</span>
                  <div className="flex justify-end gap-1.5 invisible group-hover:visible">
                    <button onClick={() => startEdit(w)} className="text-text-3 hover:text-text-1" aria-label="Edit">
                      <Pencil className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => handleDeleteWeighIn(w.id)} className="text-text-3 hover:text-danger" aria-label="Delete">
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          </div>
        </section>
      )}

      {/* Approved foods */}
      <section className="border border-border bg-bg-elevated">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="caption text-text-2">APPROVED_FOODS · {foods.length}</span>
          <Sheet open={foodDrawerOpen} onOpenChange={setFoodDrawerOpen}>
            <SheetTrigger
              render={
                <button className="caption flex items-center gap-1 border border-border px-2 py-1 text-text-2 hover:border-text-1 hover:text-text-1" />
              }
            >
              <Plus className="h-3 w-3" strokeWidth={1.5} /> ADD
            </SheetTrigger>
            <SheetContent
              side="right"
              className="!w-full md:!w-[400px] !rounded-none !border-l !border-border-strong !bg-bg-elevated !p-0"
            >
              <SheetHeader className="border-b border-border px-5 py-3">
                <SheetTitle className="caption !font-mono !text-[11px] !uppercase !tracking-[0.08em] !text-text-2">
                  ADD_FOOD
                </SheetTitle>
              </SheetHeader>
              <form onSubmit={handleAddFood} className="space-y-3 p-5">
                <label className="block space-y-1">
                  <span className="caption text-text-2">NAME</span>
                  <input
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="e.g. chicken breast"
                    className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="caption text-text-2">CATEGORY</span>
                  <Select value={foodCategory} onValueChange={(v) => setFoodCategory(v ?? '')}>
                    <SelectTrigger className="h-8 rounded-none border-border bg-transparent font-mono text-[13px]">
                      <SelectValue placeholder="select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FOOD_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="block space-y-1">
                  <span className="caption text-text-2">NOTES</span>
                  <input
                    value={foodNotes}
                    onChange={(e) => setFoodNotes(e.target.value)}
                    placeholder="optional"
                    className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="caption block w-full border border-text-1 bg-text-1 px-3 py-2 text-bg-base hover:bg-bg-base hover:text-text-1"
                >
                  ADD FOOD
                </button>
              </form>
            </SheetContent>
          </Sheet>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse bg-bg-hover" />
            ))}
          </div>
        ) : foods.length === 0 ? (
          <p className="font-mono text-xs text-text-3 px-4 py-8">&gt; no foods added yet</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3 lg:grid-cols-4">
            {foods.map((food) => (
              <li
                key={food.id}
                className="group relative border border-border bg-bg-elevated p-3 transition-colors duration-200 ease-out-200 hover:bg-bg-hover"
              >
                <button
                  onClick={() => handleDeleteFood(food.id)}
                  className="invisible absolute right-2 top-2 text-text-3 hover:text-danger group-hover:visible focus:visible"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" strokeWidth={1.5} />
                </button>
                <p className="text-[13px] text-text-1">{food.name}</p>
                <p
                  className={cn(
                    'caption mt-1',
                    FOOD_CATEGORY_TONE[food.category] || 'text-text-3',
                  )}
                >
                  {food.category.toUpperCase()}
                </p>
                {food.notes && (
                  <p className="mt-2 line-clamp-2 text-[11px] text-text-3">{food.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
