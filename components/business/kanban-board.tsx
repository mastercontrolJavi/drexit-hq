'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { toast } from 'sonner'
import { Plus, Archive, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import {
  IDEA_DIRECTIONS,
  IDEA_STATUSES,
  IDEA_STATUS_LABELS,
} from '@/types'
import type {
  BusinessIdea,
  IdeaDirection,
  IdeaPriority,
  IdeaStatus,
} from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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

// ── Seed data ──

const SEED_IDEAS: Omit<BusinessIdea, 'id' | 'updated_at' | 'created_at' | 'archived'>[] = [
  {
    title: 'AI SaaS tool',
    description: 'An AI-powered tool for a specific niche',
    direction: 'SaaS',
    priority: 'high',
    status: 'researching',
    next_action: 'Research market niches',
    notes: null,
  },
  {
    title: 'Digital product',
    description: 'Templates or courses for sale on Gumroad/Whop',
    direction: 'Digital Products',
    priority: 'medium',
    status: 'idea',
    next_action: 'List product ideas',
    notes: null,
  },
  {
    title: 'YouTube monetization',
    description: 'Still.AI channel growth and monetization strategy',
    direction: 'Content',
    priority: 'high',
    status: 'researching',
    next_action: 'Plan content calendar',
    notes: null,
  },
  {
    title: 'Micro SaaS',
    description: 'A small focused web app solving one problem',
    direction: 'SaaS',
    priority: 'medium',
    status: 'idea',
    next_action: 'Brainstorm problems to solve',
    notes: null,
  },
]

// ── Direction badge color mapping ──

const DIRECTION_COLORS: Record<IdeaDirection, string> = {
  SaaS: 'bg-[rgba(0,122,255,0.1)] text-ios-blue',
  'AI Tools': 'bg-[rgba(175,82,222,0.1)] text-ios-purple',
  Content: 'bg-[rgba(255,149,0,0.1)] text-ios-orange',
  'Digital Products': 'bg-[rgba(52,199,89,0.1)] text-ios-green',
}

const PRIORITY_COLORS: Record<IdeaPriority, string> = {
  high: 'border-red-300 text-ios-red',
  medium: 'border-orange-300 text-ios-orange',
  low: 'border-gray-300 text-muted-foreground',
}

// ── Draggable Idea Card ──

function IdeaCard({
  idea,
  onOpen,
}: {
  idea: BusinessIdea
  onOpen: (idea: BusinessIdea) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: idea.id })

  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onPointerDown={(e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY }
        listeners?.onPointerDown?.(e as React.PointerEvent)
      }}
      onPointerUp={(e) => {
        if (pointerDownPos.current) {
          const dx = Math.abs(e.clientX - pointerDownPos.current.x)
          const dy = Math.abs(e.clientY - pointerDownPos.current.y)
          if (dx < 5 && dy < 5) {
            onOpen(idea)
          }
        }
        pointerDownPos.current = null
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className="shadow-card rounded-xl p-4 active:scale-[0.98] transition-all duration-200">
        <div className="space-y-2">
          <p className="font-semibold text-sm leading-tight">{idea.title}</p>

          {idea.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {idea.description}
            </p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${DIRECTION_COLORS[idea.direction]}`}
            >
              {idea.direction}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[idea.priority]}`}
            >
              {idea.priority}
            </span>
          </div>

          {idea.next_action && (
            <p className="text-xs text-muted-foreground">
              Next: {idea.next_action}
            </p>
          )}

          <p className="text-xs text-muted-foreground text-right">
            {formatDateShort(idea.updated_at)}
          </p>
        </div>
      </Card>
    </div>
  )
}

// ── Static card for DragOverlay (no hooks) ──

function IdeaCardOverlay({ idea }: { idea: BusinessIdea }) {
  return (
    <div className="w-[260px]">
      <Card className="shadow-card rounded-xl p-4 rotate-2 scale-105">
        <div className="space-y-2">
          <p className="font-semibold text-sm leading-tight">{idea.title}</p>

          {idea.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {idea.description}
            </p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${DIRECTION_COLORS[idea.direction]}`}
            >
              {idea.direction}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[idea.priority]}`}
            >
              {idea.priority}
            </span>
          </div>

          {idea.next_action && (
            <p className="text-xs text-muted-foreground">
              Next: {idea.next_action}
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}

// ── Droppable Column ──

function KanbanColumn({
  status,
  ideas,
  onAddIdea,
  onOpenIdea,
}: {
  status: IdeaStatus
  ideas: BusinessIdea[]
  onAddIdea: (status: IdeaStatus) => void
  onOpenIdea: (idea: BusinessIdea) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status })

  return (
    <div className="min-w-[260px] flex-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{IDEA_STATUS_LABELS[status]}</h3>
          <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-ios-gray-6 px-1.5 text-xs font-medium text-muted-foreground">
            {ideas.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onAddIdea(status)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={`bg-ios-gray-6/50 rounded-xl p-3 min-h-[400px] space-y-3 transition-colors duration-200 ${
          isOver ? 'bg-[rgba(0,122,255,0.06)] ring-2 ring-ios-blue/20' : ''
        }`}
      >
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} onOpen={onOpenIdea} />
        ))}
      </div>
    </div>
  )
}

// ── Main Kanban Board ──

export function KanbanBoard() {
  const [ideas, setIdeas] = useState<BusinessIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<BusinessIdea | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [filterDirection, setFilterDirection] = useState<'all' | IdeaDirection>('all')

  // Drawer form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDirection, setFormDirection] = useState<IdeaDirection>('SaaS')
  const [formPriority, setFormPriority] = useState<IdeaPriority>('medium')
  const [formStatus, setFormStatus] = useState<IdeaStatus>('idea')
  const [formNextAction, setFormNextAction] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  // ── Fetch ideas ──

  const fetchIdeas = useCallback(async () => {
    const { data, error } = await supabase
      .from('business_ideas')
      .select('*')
      .eq('archived', false)
      .order('updated_at', { ascending: false })

    if (error) {
      toast.error('Failed to load ideas')
      setLoading(false)
      return
    }

    if (data && data.length === 0) {
      // Seed defaults
      const { error: seedError } = await supabase
        .from('business_ideas')
        .insert(
          SEED_IDEAS.map((idea) => ({
            ...idea,
            archived: false,
          }))
        )

      if (seedError) {
        toast.error('Failed to seed ideas')
        setLoading(false)
        return
      }

      // Refetch after seeding
      const { data: seeded } = await supabase
        .from('business_ideas')
        .select('*')
        .eq('archived', false)
        .order('updated_at', { ascending: false })

      setIdeas(seeded ?? [])
    } else {
      setIdeas(data ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  // ── Drag handlers ──

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)

    const { active, over } = event
    if (!over) return

    const draggedId = String(active.id)
    const targetStatus = String(over.id) as IdeaStatus

    // Only handle drops onto columns (status IDs)
    if (!IDEA_STATUSES.includes(targetStatus)) return

    const idea = ideas.find((i) => i.id === draggedId)
    if (!idea || idea.status === targetStatus) return

    // Optimistic update
    setIdeas((prev) =>
      prev.map((i) =>
        i.id === draggedId ? { ...i, status: targetStatus } : i
      )
    )

    const { error } = await supabase
      .from('business_ideas')
      .update({ status: targetStatus })
      .eq('id', draggedId)

    if (error) {
      toast.error('Failed to move idea')
      // Revert
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === draggedId ? { ...i, status: idea.status } : i
        )
      )
      return
    }

    toast.success(`Moved to ${IDEA_STATUS_LABELS[targetStatus]}`)
  }

  // ── Drawer helpers ──

  function openNewIdea(status: IdeaStatus) {
    setIsNew(true)
    setSelectedIdea(null)
    setFormTitle('')
    setFormDescription('')
    setFormDirection('SaaS')
    setFormPriority('medium')
    setFormStatus(status)
    setFormNextAction('')
    setFormNotes('')
    setDrawerOpen(true)
  }

  function openEditIdea(idea: BusinessIdea) {
    setIsNew(false)
    setSelectedIdea(idea)
    setFormTitle(idea.title)
    setFormDescription(idea.description ?? '')
    setFormDirection(idea.direction)
    setFormPriority(idea.priority)
    setFormStatus(idea.status)
    setFormNextAction(idea.next_action ?? '')
    setFormNotes(idea.notes ?? '')
    setDrawerOpen(true)
  }

  async function handleSave() {
    if (!selectedIdea) return

    const { error } = await supabase
      .from('business_ideas')
      .update({
        title: formTitle,
        description: formDescription || null,
        direction: formDirection,
        priority: formPriority,
        status: formStatus,
        next_action: formNextAction || null,
        notes: formNotes || null,
      })
      .eq('id', selectedIdea.id)

    if (error) {
      toast.error('Failed to save idea')
      return
    }

    toast.success('Idea updated')
    setDrawerOpen(false)
    fetchIdeas()
  }

  async function handleCreate() {
    if (!formTitle.trim()) {
      toast.error('Title is required')
      return
    }

    const { error } = await supabase.from('business_ideas').insert({
      title: formTitle,
      description: formDescription || null,
      direction: formDirection,
      priority: formPriority,
      status: formStatus,
      next_action: formNextAction || null,
      notes: formNotes || null,
      archived: false,
    })

    if (error) {
      toast.error('Failed to create idea')
      return
    }

    toast.success('Idea created')
    setDrawerOpen(false)
    fetchIdeas()
  }

  async function handleArchive() {
    if (!selectedIdea) return

    const { error } = await supabase
      .from('business_ideas')
      .update({ archived: true })
      .eq('id', selectedIdea.id)

    if (error) {
      toast.error('Failed to archive idea')
      return
    }

    toast.success('Idea archived')
    setDrawerOpen(false)
    fetchIdeas()
  }

  async function handleDelete() {
    if (!selectedIdea) return

    const { error } = await supabase
      .from('business_ideas')
      .delete()
      .eq('id', selectedIdea.id)

    if (error) {
      toast.error('Failed to delete idea')
      return
    }

    toast.success('Idea deleted')
    setDrawerOpen(false)
    fetchIdeas()
  }

  // ── Filter ideas ──

  const filteredIdeas =
    filterDirection === 'all'
      ? ideas
      : ideas.filter((i) => i.direction === filterDirection)

  const activeIdea = activeId ? ideas.find((i) => i.id === activeId) ?? null : null

  // ── Render ──

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-[400px] rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <button
          onClick={() => setFilterDirection('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
            filterDirection === 'all'
              ? 'bg-[rgba(0,122,255,0.1)] text-ios-blue'
              : 'text-muted-foreground hover:bg-ios-gray-6'
          }`}
        >
          All
        </button>
        {IDEA_DIRECTIONS.map((dir) => (
          <button
            key={dir}
            onClick={() => setFilterDirection(dir)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
              filterDirection === dir
                ? 'bg-[rgba(0,122,255,0.1)] text-ios-blue'
                : 'text-muted-foreground hover:bg-ios-gray-6'
            }`}
          >
            {dir}
          </button>
        ))}
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto -mx-6 px-6 pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-4 min-w-[1040px]">
            {IDEA_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                ideas={filteredIdeas.filter((i) => i.status === status)}
                onAddIdea={openNewIdea}
                onOpenIdea={openEditIdea}
              />
            ))}
          </div>

          <DragOverlay>
            {activeIdea ? <IdeaCardOverlay idea={activeIdea} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Idea drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isNew ? 'New Idea' : 'Edit Idea'}</SheetTitle>
            <SheetDescription>
              {isNew
                ? 'Add a new business idea to the board.'
                : 'Update or manage this idea.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 pb-8">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="idea-title">Title</Label>
              <Input
                id="idea-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Idea title..."
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="idea-desc">Description</Label>
              <Textarea
                id="idea-desc"
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description..."
              />
            </div>

            {/* Direction */}
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select value={formDirection} onValueChange={(val) => setFormDirection(val as IdeaDirection)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IDEA_DIRECTIONS.map((dir) => (
                    <SelectItem key={dir} value={dir}>
                      {dir}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={formPriority} onValueChange={(val) => setFormPriority(val as IdeaPriority)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(val) => setFormStatus(val as IdeaStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IDEA_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {IDEA_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Next action */}
            <div className="space-y-1.5">
              <Label htmlFor="idea-next">Next Action</Label>
              <Input
                id="idea-next"
                value={formNextAction}
                onChange={(e) => setFormNextAction(e.target.value)}
                placeholder="What's the next step?"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="idea-notes">Notes</Label>
              <Textarea
                id="idea-notes"
                rows={6}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Freeform notes, links, markdown..."
              />
            </div>

            <Separator />

            {/* Actions */}
            {isNew ? (
              <Button
                className="w-full active:scale-[0.98] transition-all duration-200"
                onClick={handleCreate}
              >
                Create Idea
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full active:scale-[0.98] transition-all duration-200"
                  onClick={handleSave}
                >
                  Save Changes
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 active:scale-[0.98] transition-all duration-200"
                    onClick={handleArchive}
                  >
                    <Archive className="h-4 w-4 mr-1.5" />
                    Archive
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 active:scale-[0.98] transition-all duration-200"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
