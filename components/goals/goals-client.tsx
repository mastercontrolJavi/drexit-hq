'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
  SheetDescription,
} from '@/components/ui/sheet'
import { Plus, Target, Trash2, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { daysUntil, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Goal, GoalCategory, GoalStatus } from '@/types'
import { GOAL_CATEGORIES } from '@/types'

const STATUS_LABELS: Record<GoalStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
}

const STATUS_VARIANTS: Record<GoalStatus, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-ios-blue/10 text-ios-blue',
  done: 'bg-ios-green/10 text-ios-green',
}

const SEED_GOALS: Omit<Goal, 'id' | 'created_at'>[] = [
  {
    title: 'Save \u00A3800+ for Mexico trip',
    description: null,
    category: 'Life',
    deadline: '2025-07-24',
    status: 'not_started',
    progress_pct: 0,
    notes: null,
  },
  {
    title: 'Travel to 3+ European cities',
    description: null,
    category: 'Life',
    deadline: '2025-07-24',
    status: 'not_started',
    progress_pct: 0,
    notes: null,
  },
  {
    title: 'Document the UK year (photos/video)',
    description: null,
    category: 'Creative',
    deadline: '2025-07-24',
    status: 'in_progress',
    progress_pct: 20,
    notes: null,
  },
  {
    title: 'Land remote job OR \u00A32,000/mo from business',
    description: null,
    category: 'Career',
    deadline: '2025-12-31',
    status: 'not_started',
    progress_pct: 0,
    notes: null,
  },
  {
    title: 'Move to a city (NYC, Madrid, or SF)',
    description: null,
    category: 'Life',
    deadline: '2025-12-31',
    status: 'not_started',
    progress_pct: 0,
    notes: null,
  },
  {
    title: 'Launch first paid digital product',
    description: null,
    category: 'Business',
    deadline: '2025-12-31',
    status: 'not_started',
    progress_pct: 0,
    notes: null,
  },
  {
    title: 'Reach 170 lbs',
    description: null,
    category: 'Fitness',
    deadline: '2025-07-24',
    status: 'in_progress',
    progress_pct: 10,
    notes: null,
  },
  {
    title: 'Post to Still.AI YouTube',
    description: null,
    category: 'Creative',
    deadline: '2025-07-24',
    status: 'in_progress',
    progress_pct: 15,
    notes: null,
  },
  {
    title: 'Build 2+ business ideas to MVP',
    description: null,
    category: 'Business',
    deadline: '2025-07-24',
    status: 'in_progress',
    progress_pct: 5,
    notes: null,
  },
]

function emptyGoal(): Omit<Goal, 'id' | 'created_at'> {
  return {
    title: '',
    description: null,
    category: 'Life',
    deadline: null,
    status: 'not_started',
    progress_pct: 0,
    notes: null,
  }
}

function deadlineColor(deadline: string | null, status: GoalStatus): string {
  if (!deadline) return 'text-muted-foreground'
  if (status === 'done') return 'text-ios-green'
  const days = daysUntil(deadline)
  if (days === 0) return 'text-ios-red'
  if (days < 30) return 'text-ios-orange'
  return 'text-ios-green'
}

function deadlineLabel(deadline: string | null, status: GoalStatus): string {
  if (!deadline) return 'No deadline'
  if (status === 'done') return 'Completed'
  const days = daysUntil(deadline)
  if (days === 0) return 'Overdue'
  return `${days} days remaining`
}

export function GoalsClient() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [filter, setFilter] = useState<GoalCategory | 'All'>('All')
  const [saving, setSaving] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState<GoalCategory>('Life')
  const [formDeadline, setFormDeadline] = useState('')
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
      // Seed default goals
      const { error: insertError } = await supabase
        .from('goals')
        .insert(SEED_GOALS)

      if (insertError) {
        toast.error('Failed to create default goals')
        setLoading(false)
        return
      }

      // Refetch after seeding
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
      const { error } = await supabase
        .from('goals')
        .update(payload)
        .eq('id', selectedGoal.id)
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
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', selectedGoal.id)

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

  const filteredGoals =
    filter === 'All' ? goals : goals.filter((g) => g.category === filter)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-end">
        <Button
          onClick={openNewGoalDrawer}
          className="active:scale-[0.98] transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Goal
        </Button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('All')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
            filter === 'All'
              ? 'bg-ios-blue text-white'
              : 'bg-ios-gray-6 text-muted-foreground'
          }`}
        >
          All
        </button>
        {GOAL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
              filter === cat
                ? 'bg-ios-blue text-white'
                : 'bg-ios-gray-6 text-muted-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Timeline View */}
      {filteredGoals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No goals in this category yet.</p>
        </div>
      ) : (
        <div className="relative pl-8">
          {/* Vertical timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-ios-gray-3" />

          <div className="space-y-5">
            {filteredGoals.map((goal) => {
              const color = deadlineColor(goal.deadline, goal.status)
              const label = deadlineLabel(goal.deadline, goal.status)

              return (
                <div key={goal.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-5 top-5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                      goal.status === 'done'
                        ? 'bg-ios-green'
                        : goal.status === 'in_progress'
                          ? 'bg-ios-blue'
                          : 'bg-muted-foreground/40'
                    }`}
                  />

                  <Card
                    className="shadow-card cursor-pointer active:scale-[0.98] transition-all duration-200"
                    onClick={() => openGoalDrawer(goal)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base leading-snug">
                            {goal.title}
                          </h3>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {goal.description}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={`shrink-0 ${STATUS_VARIANTS[goal.status]}`}
                          variant="secondary"
                        >
                          {STATUS_LABELS[goal.status]}
                        </Badge>
                      </div>

                      {/* Progress */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Progress
                          </span>
                          <span className="text-xs font-medium text-muted-foreground tabular-nums">
                            {goal.progress_pct}%
                          </span>
                        </div>
                        <Progress value={goal.progress_pct} />
                      </div>

                      {/* Deadline */}
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className={`h-3.5 w-3.5 ${color}`} />
                        <span className={`text-xs font-medium ${color}`}>
                          {goal.deadline ? formatDate(goal.deadline) : 'No deadline'}
                        </span>
                        <Separator orientation="vertical" className="h-3 mx-1" />
                        <span className={`text-xs font-medium ${color}`}>
                          {label}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Goal Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isNew ? 'New Goal' : 'Edit Goal'}</SheetTitle>
            <SheetDescription>
              {isNew
                ? 'Create a new goal to track your progress.'
                : 'Update this goal or track your progress.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 pb-8">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Title
              </Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Goal title..."
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Category
              </Label>
              <Select
                value={formCategory}
                onValueChange={(val) => setFormCategory(val as GoalCategory)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Deadline
              </Label>
              <Input
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </Label>
              <Select
                value={formStatus}
                onValueChange={(val) => setFormStatus(val as GoalStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Progress
                </Label>
                <span className="text-sm font-medium tabular-nums">
                  {formProgress}%
                </span>
              </div>
              <Slider
                value={[formProgress]}
                onValueChange={(val) =>
                  setFormProgress(Array.isArray(val) ? val[0] : val)
                }
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Notes
              </Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={5}
              />
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full active:scale-[0.98] transition-all duration-200"
              >
                {saving ? 'Saving...' : isNew ? 'Create Goal' : 'Save Changes'}
              </Button>

              {!isNew && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={saving}
                  className="w-full text-ios-red hover:text-ios-red active:scale-[0.98] transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Goal
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
