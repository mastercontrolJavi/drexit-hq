'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  cn,
  formatDate,
  formatDateShort,
  getUserMacros,
  calculateTargetWeight,
} from '@/lib/utils'
import {
  WeighIn,
  FoodItem,
  FOOD_CATEGORIES,
  USER_STATS,
  DREXIT_DATE,
  WEIGHT_START_DATE,
} from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Flame,
  Beef,
  Droplets,
  Wheat,
  Trash2,
  Plus,
  TrendingDown,
  TrendingUp,
  X,
  Pencil,
  Check,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  ComposedChart,
  ReferenceLine,
  Legend,
} from 'recharts'

const CATEGORY_COLORS: Record<string, string> = {
  Protein: 'bg-ios-blue/10 text-ios-blue',
  Carb: 'bg-ios-orange/10 text-ios-orange',
  Fat: 'bg-ios-purple/10 text-ios-purple',
  Veg: 'bg-ios-green/10 text-ios-green',
  Other: 'bg-ios-gray-6 text-muted-foreground',
}

const tooltipStyle = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: '13px',
}

export function FitnessClient() {
  const [weighIns, setWeighIns] = useState<WeighIn[]>([])
  const [foods, setFoods] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [foodDrawerOpen, setFoodDrawerOpen] = useState(false)

  // Weigh-in form
  const [wiDate, setWiDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [wiWeight, setWiWeight] = useState('')
  const [wiBmi, setWiBmi] = useState('')
  const [wiBodyFat, setWiBodyFat] = useState('')
  const [wiNote, setWiNote] = useState('')

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editBmi, setEditBmi] = useState('')
  const [editBodyFat, setEditBodyFat] = useState('')
  const [editNote, setEditNote] = useState('')

  // Food form
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

  // Weight chart data (keep existing chart)
  const chartData = weighIns.map((w) => ({
    date: formatDateShort(w.date),
    weight: Number(w.weight_lbs),
    target: calculateTargetWeight(
      USER_STATS.currentWeight,
      USER_STATS.goalWeight,
      WEIGHT_START_DATE,
      DREXIT_DATE,
      new Date(w.date)
    ),
  }))

  // BMI chart data
  const bmiChartData = weighIns
    .filter((w) => w.bmi !== null)
    .map((w) => ({
      date: formatDateShort(w.date),
      bmi: Number(w.bmi),
    }))

  // Body fat chart data
  const bodyFatChartData = weighIns
    .filter((w) => w.body_fat_pct !== null)
    .map((w) => ({
      date: formatDateShort(w.date),
      bodyFat: Number(w.body_fat_pct),
    }))

  // Composition overview chart (weight + BMI + body fat together, normalized)
  const compositionData = weighIns
    .filter((w) => w.bmi !== null || w.body_fat_pct !== null)
    .map((w) => ({
      date: formatDateShort(w.date),
      weight: Number(w.weight_lbs),
      bmi: w.bmi !== null ? Number(w.bmi) : undefined,
      bodyFat: w.body_fat_pct !== null ? Number(w.body_fat_pct) : undefined,
    }))

  const latestWeight = weighIns.length > 0 ? Number(weighIns[weighIns.length - 1].weight_lbs) : null
  const latestBmi = weighIns.length > 0 ? weighIns[weighIns.length - 1].bmi : null
  const latestBodyFat = weighIns.length > 0 ? weighIns[weighIns.length - 1].body_fat_pct : null
  const latestTarget = latestWeight
    ? calculateTargetWeight(
        USER_STATS.currentWeight,
        USER_STATS.goalWeight,
        WEIGHT_START_DATE,
        DREXIT_DATE
      )
    : null
  const isOnTrack = latestWeight && latestTarget ? latestWeight <= latestTarget : null

  // BMI category helper
  function getBmiCategory(bmi: number): { label: string; color: string } {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-ios-orange' }
    if (bmi < 25) return { label: 'Normal', color: 'text-ios-green' }
    if (bmi < 30) return { label: 'Overweight', color: 'text-ios-orange' }
    return { label: 'Obese', color: 'text-ios-red' }
  }

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
      { onConflict: 'date' }
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

  const macroCards = [
    { label: 'Daily Calories', value: macros.calories, suffix: 'kcal', icon: Flame, color: 'text-ios-red' },
    { label: 'Protein', value: macros.protein, suffix: 'g', icon: Beef, color: 'text-ios-blue' },
    { label: 'Fat', value: macros.fat, suffix: 'g', icon: Droplets, color: 'text-ios-orange' },
    { label: 'Carbs', value: macros.carbs, suffix: 'g', icon: Wheat, color: 'text-ios-green' },
  ]

  return (
    <div className="space-y-8">
      {/* Macro Cards */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {macroCards.map((card) => (
          <Card key={card.label} className="shadow-card border-none">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                <card.icon className={cn('h-4 w-4', card.color)} />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className={cn('text-[40px] font-bold leading-none tracking-tight', card.color)}>
                  {card.value}
                </span>
                <span className="text-sm text-muted-foreground">{card.suffix}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Weigh-In Form */}
        <Card className="shadow-card border-none">
          <CardHeader>
            <CardTitle>Log Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogWeight} className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={wiDate} onChange={(e) => setWiDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Weight (lbs) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={wiWeight}
                  onChange={(e) => setWiWeight(e.target.value)}
                  placeholder="e.g. 210.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>BMI</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={wiBmi}
                    onChange={(e) => setWiBmi(e.target.value)}
                    placeholder="e.g. 28.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Body Fat %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={wiBodyFat}
                    onChange={(e) => setWiBodyFat(e.target.value)}
                    placeholder="e.g. 22.0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Input value={wiNote} onChange={(e) => setWiNote(e.target.value)} placeholder="How are you feeling?" />
              </div>
              <Button
                type="submit"
                className="w-full bg-ios-blue text-white hover:bg-ios-blue/90 active:scale-[0.98] transition-all duration-200"
              >
                Log Entry
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Weight Chart (kept as-is) */}
        <Card className="shadow-card border-none lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Weight Progress</CardTitle>
              {isOnTrack !== null && (
                <Badge className={cn('text-xs', isOnTrack ? 'bg-ios-green/10 text-ios-green' : 'bg-ios-orange/10 text-ios-orange')}>
                  {isOnTrack ? (
                    <><TrendingDown className="mr-1 h-3 w-3" /> On Track</>
                  ) : (
                    <><TrendingUp className="mr-1 h-3 w-3" /> Behind</>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No weigh-ins yet. Log your first entry.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="weight" stroke="#FF9500" strokeWidth={2} dot={{ r: 4, fill: '#FF9500' }} name="Actual" />
                  <Line type="monotone" dataKey="target" stroke="#34C759" strokeWidth={1.5} strokeDasharray="6 4" dot={false} name="Target" />
                </LineChart>
              </ResponsiveContainer>
            )}
            {latestWeight && (
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>
                  Current: <strong className="text-ios-orange">{latestWeight} lbs</strong>
                </span>
                <span>
                  Target: <strong className="text-ios-green">{USER_STATS.goalWeight} lbs</strong>
                </span>
                <span>
                  To go: <strong>{(latestWeight - USER_STATS.goalWeight).toFixed(1)} lbs</strong>
                </span>
                {latestBmi !== null && (
                  <span>
                    BMI: <strong className={getBmiCategory(Number(latestBmi)).color}>
                      {Number(latestBmi).toFixed(1)}
                    </strong>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({getBmiCategory(Number(latestBmi)).label})
                    </span>
                  </span>
                )}
                {latestBodyFat !== null && (
                  <span>
                    Body Fat: <strong className="text-ios-purple">{Number(latestBodyFat).toFixed(1)}%</strong>
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Body Composition Charts */}
      {(bmiChartData.length > 0 || bodyFatChartData.length > 0) && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Body Composition</h3>
          <Tabs defaultValue="bmi" className="w-full">
            <TabsList className="bg-ios-gray-6 rounded-xl p-1">
              {bmiChartData.length > 0 && (
                <TabsTrigger value="bmi" className="rounded-lg text-xs">BMI Trend</TabsTrigger>
              )}
              {bodyFatChartData.length > 0 && (
                <TabsTrigger value="bodyfat" className="rounded-lg text-xs">Body Fat % Trend</TabsTrigger>
              )}
              {compositionData.length > 0 && (
                <TabsTrigger value="overview" className="rounded-lg text-xs">Overview</TabsTrigger>
              )}
            </TabsList>

            {/* BMI Trend */}
            {bmiChartData.length > 0 && (
              <TabsContent value="bmi">
                <Card className="shadow-card border-none">
                  <CardHeader>
                    <CardTitle className="text-base">BMI Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={bmiChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [Number(value).toFixed(1), 'BMI']} />
                        <defs>
                          <linearGradient id="bmiGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#007AFF" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        {/* BMI zone reference lines */}
                        <ReferenceLine y={18.5} stroke="#FF9500" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Underweight', position: 'left', fontSize: 9, fill: '#FF9500' }} />
                        <ReferenceLine y={25} stroke="#34C759" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Normal', position: 'left', fontSize: 9, fill: '#34C759' }} />
                        <ReferenceLine y={30} stroke="#FF3B30" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Obese', position: 'left', fontSize: 9, fill: '#FF3B30' }} />
                        <Area type="monotone" dataKey="bmi" stroke="#007AFF" strokeWidth={2} fill="url(#bmiGradient)" dot={{ r: 4, fill: '#007AFF' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Body Fat Trend */}
            {bodyFatChartData.length > 0 && (
              <TabsContent value="bodyfat">
                <Card className="shadow-card border-none">
                  <CardHeader>
                    <CardTitle className="text-base">Body Fat % Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={bodyFatChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(v) => `${v}%`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Body Fat']} />
                        <defs>
                          <linearGradient id="bfGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#AF52DE" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#AF52DE" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="bodyFat" stroke="#AF52DE" strokeWidth={2} fill="url(#bfGradient)" dot={{ r: 4, fill: '#AF52DE' }} name="Body Fat %" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Overview — all metrics */}
            {compositionData.length > 0 && (
              <TabsContent value="overview">
                <Card className="shadow-card border-none">
                  <CardHeader>
                    <CardTitle className="text-base">All Metrics — Weight, BMI & Body Fat</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={compositionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="weight" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                        <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 'dataMax + 5']} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Line yAxisId="weight" type="monotone" dataKey="weight" stroke="#FF9500" strokeWidth={2} dot={{ r: 3, fill: '#FF9500' }} name="Weight (lbs)" />
                        <Line yAxisId="pct" type="monotone" dataKey="bmi" stroke="#007AFF" strokeWidth={2} dot={{ r: 3, fill: '#007AFF' }} name="BMI" />
                        <Line yAxisId="pct" type="monotone" dataKey="bodyFat" stroke="#AF52DE" strokeWidth={2} dot={{ r: 3, fill: '#AF52DE' }} name="Body Fat %" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}

      {/* Weight Log Table — with inline editing */}
      {weighIns.length > 0 && (
        <Card className="shadow-card border-none">
          <CardHeader>
            <CardTitle>Weigh-In History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>BMI</TableHead>
                  <TableHead>Body Fat</TableHead>
                  <TableHead>Delta</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...weighIns].reverse().map((w, i, arr) => {
                  const prev = arr[i + 1]
                  const delta = prev ? Number(w.weight_lbs) - Number(prev.weight_lbs) : null
                  const isEditing = editingId === w.id

                  if (isEditing) {
                    return (
                      <TableRow key={w.id} className="bg-ios-blue/5">
                        <TableCell className="text-sm font-medium">{formatDate(w.date)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            className="h-7 w-20 text-xs"
                            autoFocus
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={editBmi}
                            onChange={(e) => setEditBmi(e.target.value)}
                            className="h-7 w-16 text-xs"
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={editBodyFat}
                            onChange={(e) => setEditBodyFat(e.target.value)}
                            className="h-7 w-16 text-xs"
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell />
                        <TableCell>
                          <Input
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            className="h-7 text-xs"
                            placeholder="Note"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(w)}
                              className="text-ios-green hover:text-ios-green/80 transition-colors"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  }

                  return (
                    <TableRow key={w.id} className="hover:bg-ios-gray-6 transition-colors">
                      <TableCell className="text-sm">{formatDate(w.date)}</TableCell>
                      <TableCell className="text-sm font-medium">{Number(w.weight_lbs)} lbs</TableCell>
                      <TableCell className="text-sm">
                        {w.bmi !== null ? (
                          <span className={getBmiCategory(Number(w.bmi)).color}>
                            {Number(w.bmi).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {w.body_fat_pct !== null ? (
                          <span className="text-ios-purple">{Number(w.body_fat_pct).toFixed(1)}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {delta !== null && (
                          <span
                            className={cn('text-sm font-medium', delta < 0 ? 'text-ios-green' : delta > 0 ? 'text-ios-red' : 'text-muted-foreground')}
                          >
                            {delta > 0 ? '+' : ''}
                            {delta.toFixed(1)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.note || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(w)}
                            className="text-muted-foreground hover:text-ios-blue transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWeighIn(w.id)}
                            className="text-muted-foreground hover:text-ios-red transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Food List */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Approved Foods</h3>
          <Sheet open={foodDrawerOpen} onOpenChange={setFoodDrawerOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="active:scale-[0.98] transition-all duration-200"
                />
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Add Food
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px]">
              <SheetHeader>
                <SheetTitle>Add Food</SheetTitle>
              </SheetHeader>
              <form onSubmit={handleAddFood} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="e.g. Chicken breast" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={foodCategory} onValueChange={(v) => setFoodCategory(v ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FOOD_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input value={foodNotes} onChange={(e) => setFoodNotes(e.target.value)} placeholder="Prep tips, macros, etc." />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-ios-blue text-white hover:bg-ios-blue/90 active:scale-[0.98] transition-all duration-200"
                >
                  Add Food
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : foods.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No foods added yet. Build your approved food list.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {foods.map((food) => (
              <Card key={food.id} className="shadow-card border-none group relative">
                <CardContent className="pt-4">
                  <button
                    onClick={() => handleDeleteFood(food.id)}
                    className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-ios-red transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="font-medium text-sm">{food.name}</p>
                  <Badge className={cn('mt-2 text-[11px]', CATEGORY_COLORS[food.category] || CATEGORY_COLORS.Other)}>
                    {food.category}
                  </Badge>
                  {food.notes && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{food.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
