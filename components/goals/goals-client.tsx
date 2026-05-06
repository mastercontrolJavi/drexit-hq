'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Plus, Target, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, daysUntil, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Goal, GoalCategory, GoalStatus } from '@/types'
import { GOAL_CATEGORIES } from '@/types'
import { TimelineRail } from '@/components/data/timeline-rail'
import { StatusLabel } from '@/components/data/status-label'
import { HairlineProgress } from '@/components/data/hairline-progress'
import {
  UnderlineTabs,
  type UnderlineTabOption,
} from '@/components/data/underline-tabs'

const SEED_GOALS: Omit<Goal, 'id' | 'created_at'>[] = [
  { title: 'Save £800+ for Mexico trip',                description: null, category: 'Life',     deadline: '2026-07-07', target_quarter: null, status: 'not_started', progress_pct: 0,  notes: null },
  { title: 'Travel to 3+ European cities',              description: null, category: 'Life',     deadline: '2026-07-07', target_quarter: null, status: 'not_started', progress_pct: 0,  notes: null },
  { title: 'Document the UK year (photos/video)',       description: null, category: 'Creative', deadline: '2026-07-07', target_quarter: null, status: 'in_progress', progress_pct: 20, notes: null },
  { title: 'Land remote job OR £2,000/mo from business', description: null, category: 'Career',   deadline: '2025-12-31', target_quarter: null, status: 'not_started', progress_pct: 0,  notes: null },
  { title: 'Move to a city (NYC, Madrid, or SF)',       description: null, category: 'Life',     deadline: '2025-12-31', target_quarter: null, status: 'not_started', progress_pct: 0,  notes: null },
  { title: 'Launch first paid digital product',         description: null, category: 'Business', deadline: '2025-12-31', target_quarter: null, status: 'not_started', progress_pct: 0,  notes: null },
  { title: 'Reach 170 lbs',                             description: null, category: 'Fitness',  deadline: '2026-07-07', target_quarter: null, status: 'in_progress', progress_pct: 10, notes: null },
  { title: 'Post to Still.AI YouTube',                  description: null, category: 'Creative', deadline: '2026-07-07', target_quarter: null, status: 'in_progress', progress_pct: 15, notes: null },
  { title: 'Build 2+ business ideas to MVP',            description: null, category: 'Business', deadline: '2026-07-07', target_quarter: null, status: 'in_progress', progress_pct: 5,  notes: null },
]

function generateQuarterOptions(): string[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const options: string[] = []
  for (let y = currentYear; y <= currentYear + 1; y++) {
    for (let q = 1; q <= 4; q++) {
      options.push(`Q${q} ${y}`)
    }
  }
  return options
}
const QUARTER_OPTIONS = generateQuarterOptions()

function emptyGoal(): Omit<Goal, 'id' | 'created_at'> {
  return {
    title: '',
    description: null,
    category: 'Life',
    deadline: null,
    target_quarter: null,
    status: 'not_started',
    progress_pct: 0,
    notes: null,
  }
}

function deadlineTone(deadline: string | null, status: GoalStatus): 'success' | 'warn' | 'danger' | 'text-3' {
  if (!deadline) return 'text-3'
  if (status === 'done') return 'success'
  const days = daysUntil(deadline)
  if (days === 0) return 'danger'
  if (days < 30) return 'warn'
  return 'success'
}

const TONE_TEXT_CLASS = {
  success: 'text-success',
  warn:    'text-warn',
  danger:  'text-danger',
  'text-3':'text-text-3',
} as const

function deadlineLabel(deadline: string | null, status: GoalStatus): string {
  if (!deadline) return 'NO DEADLINE'
  if (status === 'done') return 'COMPLETED'
  const days = daysUntil(deadline)
  if (days === 0) return 'OVERDUE'
  return `${days}D REMAINING`
}

const ALL_FILTER = 'All'
type FilterValue = typeof ALL_FILTER | GoalCategory

export function GoalsClient() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [filter, setFilter] = useState<FilterValue>(ALL_FILTER)
  const [saving, setSaving] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState<GoalCategory>('Life')
  const [formDeadline, setFormDeadline] = useState('')
  const [formQuarter, setFormQuarter] = useState('')
  const [formStatus, setFormStatus] = useState<GoalStatus>('not_started')
  const [formProgress, setFormProgress] = useState(0)
  const [formNotes, setFormNotes] = useState('')

  const fetchGoals = useCallback(async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('deadline', { ascending: true })

    if (error) {
      toast.error('Failed to load goals')
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      const { error: insertError } = await supabase.from('goals').insert(SEED_GOALS)
      if (insertError) {
        toast.error('Failed to create default goals')
        setLoading(false)
        return
      }
      const { data: seeded } = await supabase
        .from('goals')
        .select('*')
        .order('deadline', { ascending: true })
      setGoals((seeded as Goal[]) ?? [])
    } else {
      setGoals(data as Goal[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  function openGoalDrawer(goal: Goal) {
    setSelectedGoal(goal)
    setIsNew(false)
    setFormTitle(goal.title)
    setFormDescription(goal.description ?? '')
    setFormCategory(goal.category)
    setFormDeadline(goal.deadline ?? '')
    setFormQuarter(goal.target_quarter ?? '')
    setFormStatus(goal.status)
    setFormProgress(goal.progress_pct)
    setFormNotes(goal.notes ?? '')
    setDrawerOpen(true)
  }

  function openNewGoalDrawer() {
    const blank = emptyGoal()
    setSelectedGoal(null)
    setIsNew(true)
    setFormTitle(blank.title)
    setFormDescription('')
    setFormCategory(blank.category)
    setFormDeadline('')
    setFormQuarter('')
    setFormStatus(blank.status)
    setFormProgress(blank.progress_pct)
    setFormNotes('')
    setDrawerOpen(true)
  }

  async function handleSave() {
    if (!formTitle.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      category: formCategory,
      deadline: formDeadline || null,
      target_quarter: formQuarter || null,
      status: formStatus,
      progress_pct: formProgress,
      notes: formNotes.trim() || null,
    }

    if (isNew) {
      const { error } = await supabase.from('goals').insert(payload)
      if (error) {
        toast.error('Failed to create goal')
        setSaving(false)
        return
      }
      toast.success('Goal created')
    } else if (selectedGoal) {
      const { error } = await supabase.from('goals').update(payload).eq('id', selectedGoal.id)
      if (error) {
        toast.error('Failed to update goal')
        setSaving(false)
        return
      }
      toast.success('Goal updated')
    }

    setSaving(false)
    setDrawerOpen(false)
    fetchGoals()
  }

  async function handleDelete() {
    if (!selectedGoal) return
    setSaving(true)
    const { error } = await supabase.from('goals').delete().eq('id', selectedGoal.id)
    if (error) {
      toast.error('Failed to delete goal')
      setSaving(false)
      return
    }
    toast.success('Goal deleted')
    setSaving(false)
    setDrawerOpen(false)
    fetchGoals()
  }

  const filteredGoals = filter === ALL_FILTER ? goals : goals.filter((g) => g.category === filter)

  // Stats: count by status across the full list (not filtered)
  const statusCounts = goals.reduce(
    (acc, g) => {
      acc[g.status] += 1
      return acc
    },
    { not_started: 0, in_progress: 0, done: 0 } as Record<GoalStatus, number>,
  )

  const filterTabs: UnderlineTabOption<FilterValue>[] = [
    { value: ALL_FILTER, label: 'ALL', hint: String(goals.length) },
    ...GOAL_CATEGORIES.map((c) => ({
      value: c as FilterValue,
      label: c.toUpperCase(),
    })),
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-72 animate-pulse bg-bg-hover" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-bg-hover" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Status strip */}
      <div className="grid grid-cols-3 border border-border bg-bg-elevated divide-x divide-border">
        <div className="px-5 py-4">
          <span className="caption text-text-2">NOT_STARTED</span>
          <p className="num-display mt-1 text-[28px] leading-none text-text-3">
            {statusCounts.not_started}
          </p>
        </div>
        <div className="px-5 py-4">
          <span className="caption text-text-2">IN_PROGRESS</span>
          <p className="num-display mt-1 text-[28px] leading-none text-accent">
            {statusCounts.in_progress}
          </p>
        </div>
        <div className="px-5 py-4">
          <span className="caption text-text-2">COMPLETE</span>
          <p className="num-display mt-1 text-[28px] leading-none text-success">
            {statusCounts.done}
          </p>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <UnderlineTabs<FilterValue>
          options={filterTabs}
          value={filter}
          onChange={setFilter}
          className="flex-1"
          scroll
        />
        <button
          onClick={openNewGoalDrawer}
          className="caption flex items-center gap-1.5 border border-text-1 bg-text-1 px-3 py-2 text-bg-base transition-colors duration-200 ease-out-200 hover:bg-bg-base hover:text-text-1"
        >
          <Plus className="h-3 w-3" strokeWidth={1.5} /> ADD GOAL
        </button>
      </div>

      {/* Timeline */}
      {filteredGoals.length === 0 ? (
        <div className="border border-border bg-bg-elevated px-4 py-16 text-center">
          <Target className="mx-auto h-5 w-5 text-text-3" strokeWidth={1.5} />
          <p className="caption mt-3 text-text-2">NO GOALS IN THIS CATEGORY</p>
        </div>
      ) : (
        <TimelineRail>
          {filteredGoals.map((goal) => {
            const tone = deadlineTone(goal.deadline, goal.status)
            const dotTone =
              goal.status === 'done' ? 'success' : goal.status === 'in_progress' ? 'accent' : 'neutral'
            return (
              <TimelineRail.Item
                key={goal.id}
                tone={dotTone}
                active={goal.status === 'in_progress'}
              >
                <button
                  onClick={() => openGoalDrawer(goal)}
                  className="block w-full border border-border bg-bg-elevated p-4 text-left transition-colors duration-200 ease-out-200 hover:border-border-strong hover:bg-bg-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-medium leading-snug text-text-1">
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="mt-1 line-clamp-2 text-[12px] text-text-2">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 shrink-0 max-w-[45%] sm:max-w-none">
                      {goal.target_quarter && (
                        <span className="caption border border-border px-1.5 py-0.5 text-text-3">
                          {goal.target_quarter.toUpperCase()}
                        </span>
                      )}
                      <span className="caption text-text-3 hidden sm:inline">·</span>
                      <span className="caption text-text-3">{goal.category.toUpperCase()}</span>
                      <span className="caption text-text-3">·</span>
                      <StatusLabel status={goal.status} />
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between caption">
                      <span className="text-text-3">PROGRESS</span>
                      <span className="font-mono text-[11px] tabular-nums text-text-1">
                        {goal.progress_pct}%
                      </span>
                    </div>
                    <HairlineProgress
                      value={goal.progress_pct}
                      tone={goal.status === 'done' ? 'success' : goal.status === 'in_progress' ? 'accent' : 'neutral'}
                      height={2}
                    />
                  </div>

                  {/* Deadline */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 caption">
                    <span className={cn('font-mono', TONE_TEXT_CLASS[tone])}>
                      {goal.deadline ? formatDate(goal.deadline).toUpperCase() : 'NO DEADLINE'}
                    </span>
                    <span className="text-text-3">·</span>
                    <span className={cn('font-mono', TONE_TEXT_CLASS[tone])}>
                      {deadlineLabel(goal.deadline, goal.status)}
                    </span>
                  </div>
                </button>
              </TimelineRail.Item>
            )
          })}
        </TimelineRail>
      )}

      {/* Goal Dialog */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent
          className="!max-w-lg !max-h-[88vh] overflow-y-auto !rounded-none !border !border-border-strong !bg-bg-elevated !p-0 !ring-0"
          showCloseButton={false}
        >
          <DialogHeader className="border-b border-border px-5 py-3">
            <DialogTitle className="caption !font-mono !text-[11px] !uppercase !tracking-[0.08em] !text-text-2 flex items-center justify-between">
              <span>{isNew ? 'NEW_GOAL' : 'EDIT_GOAL'}</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-text-3 hover:text-text-1"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </DialogTitle>
            <DialogDescription className="font-mono text-[11px] text-text-3">
              &gt; {isNew ? 'create a new goal' : 'update or delete'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-5">
            <label className="block space-y-1">
              <span className="caption text-text-2">TITLE</span>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="goal title..."
                className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="caption text-text-2">DESCRIPTION</span>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="optional"
                rows={2}
                className="block w-full resize-none border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="caption text-text-2">CATEGORY</span>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v as GoalCategory)}>
                  <SelectTrigger className="h-8 rounded-none border-border bg-transparent font-mono text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="block space-y-1">
                <span className="caption text-text-2">QUARTER</span>
                <Select
                  value={formQuarter || 'none'}
                  onValueChange={(v) => setFormQuarter(!v || v === 'none' ? '' : v)}
                >
                  <SelectTrigger className="h-8 rounded-none border-border bg-transparent font-mono text-[13px]">
                    <SelectValue placeholder="none" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {QUARTER_OPTIONS.map((q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="caption text-text-2">DEADLINE</span>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] tabular-nums text-text-1 focus:border-text-2 focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="caption text-text-2">STATUS</span>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as GoalStatus)}>
                  <SelectTrigger className="h-8 rounded-none border-border bg-transparent font-mono text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="caption text-text-2">PROGRESS</span>
                <span className="font-mono text-[12px] tabular-nums text-text-1">{formProgress}%</span>
              </div>
              <Slider
                value={[formProgress]}
                onValueChange={(val) => setFormProgress(Array.isArray(val) ? val[0] : val)}
                min={0}
                max={100}
                step={5}
              />
            </div>

            <label className="block space-y-1">
              <span className="caption text-text-2">NOTES</span>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="optional"
                rows={3}
                className="block w-full resize-none border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
            </label>

            <div className="flex gap-2 border-t border-border pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="caption flex-1 border border-text-1 bg-text-1 px-3 py-2 text-bg-base transition-colors disabled:opacity-50 hover:bg-bg-base hover:text-text-1 disabled:hover:bg-text-1 disabled:hover:text-bg-base"
              >
                {saving ? 'SAVING...' : isNew ? 'CREATE GOAL' : 'SAVE CHANGES'}
              </button>
              {!isNew && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="caption border border-border px-3 py-2 text-text-2 transition-colors hover:border-danger hover:text-danger"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
