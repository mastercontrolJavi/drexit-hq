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
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { toast } from 'sonner'
import { Archive, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, formatDateShort } from '@/lib/utils'
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  UnderlineTabs,
  type UnderlineTabOption,
} from '@/components/data/underline-tabs'

const SEED_IDEAS: Omit<BusinessIdea, 'id' | 'updated_at' | 'created_at' | 'archived'>[] = [
  { title: 'AI SaaS tool',          description: 'An AI-powered tool for a specific niche',         direction: 'SaaS',             priority: 'high',   status: 'researching', next_action: 'Research market niches',  notes: null },
  { title: 'Digital product',       description: 'Templates or courses for sale on Gumroad/Whop',  direction: 'Digital Products', priority: 'medium', status: 'idea',        next_action: 'List product ideas',      notes: null },
  { title: 'YouTube monetization',  description: 'Still.AI channel growth and monetization',      direction: 'Content',          priority: 'high',   status: 'researching', next_action: 'Plan content calendar',   notes: null },
  { title: 'Micro SaaS',            description: 'A small focused web app solving one problem',   direction: 'SaaS',             priority: 'medium', status: 'idea',        next_action: 'Brainstorm problems',     notes: null },
]

// Single-letter mono badges for direction
const DIRECTION_BADGE: Record<IdeaDirection, string> = {
  SaaS: 'S',
  'AI Tools': 'A',
  Content: 'C',
  'Digital Products': 'D',
}

const PRIORITY_BORDER: Record<IdeaPriority, string> = {
  high:   'before:bg-danger',
  medium: 'before:bg-warn',
  low:    'before:bg-success',
}

const PRIORITY_LABEL_TONE: Record<IdeaPriority, string> = {
  high:   'text-danger',
  medium: 'text-warn',
  low:    'text-success',
}

type FilterValue = 'all' | IdeaDirection

// ── Card content (shared by draggable + overlay) ──

function CardBody({ idea }: { idea: BusinessIdea }) {
  return (
    <div
      className={cn(
        'relative border border-border bg-bg-elevated p-3 pl-3.5 transition-colors duration-200 ease-out-200',
        // Priority hairline as a ::before so we can keep the card itself rectangular
        'before:absolute before:inset-y-0 before:left-0 before:w-[3px]',
        PRIORITY_BORDER[idea.priority],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium leading-tight text-text-1">{idea.title}</p>
        <span
          className="shrink-0 border border-border px-1 caption text-text-2"
          title={idea.direction}
        >
          {DIRECTION_BADGE[idea.direction]}
        </span>
      </div>

      {idea.description && (
        <p className="mt-1.5 line-clamp-2 text-[12px] text-text-2">{idea.description}</p>
      )}

      <div className="mt-2 flex items-center justify-between caption">
        <span className={PRIORITY_LABEL_TONE[idea.priority]}>{idea.priority.toUpperCase()}</span>
        <span className="text-text-3">{formatDateShort(idea.updated_at).toUpperCase()}</span>
      </div>

      {idea.next_action && (
        <p className="mt-2 border-t border-border pt-2 caption text-text-3">
          NEXT · <span className="text-text-2 normal-case tracking-normal">{idea.next_action}</span>
        </p>
      )}
    </div>
  )
}

function IdeaCard({
  idea,
  onOpen,
}: {
  idea: BusinessIdea
  onOpen: (idea: BusinessIdea) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: idea.id })
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
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
          if (dx < 5 && dy < 5) onOpen(idea)
        }
        pointerDownPos.current = null
      }}
      className="cursor-grab active:cursor-grabbing kanban-card"
    >
      <CardBody idea={idea} />
    </div>
  )
}

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
    <section className="w-[85vw] shrink-0 snap-start md:w-auto md:min-w-[260px] md:flex-1 border border-border bg-bg-elevated">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="caption text-text-1">
          {IDEA_STATUS_LABELS[status].toUpperCase().replace(' ', '_')}
          <span className="ml-1.5 text-text-3">({ideas.length})</span>
        </span>
        <button
          onClick={() => onAddIdea(status)}
          className="text-text-3 transition-colors hover:text-text-1"
          aria-label="Add idea"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[420px] space-y-2 p-3 transition-colors duration-200 ease-out-200',
          isOver && 'bg-bg-hover',
        )}
      >
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} onOpen={onOpenIdea} />
        ))}
        {ideas.length === 0 && (
          <p className="font-mono text-xs text-text-3 py-2">&gt; empty</p>
        )}
      </div>
    </section>
  )
}

export function KanbanBoard() {
  const [ideas, setIdeas] = useState<BusinessIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<BusinessIdea | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [filterDirection, setFilterDirection] = useState<FilterValue>('all')

  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDirection, setFormDirection] = useState<IdeaDirection>('SaaS')
  const [formPriority, setFormPriority] = useState<IdeaPriority>('medium')
  const [formStatus, setFormStatus] = useState<IdeaStatus>('idea')
  const [formNextAction, setFormNextAction] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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
      const { error: seedError } = await supabase.from('business_ideas').insert(
        SEED_IDEAS.map((idea) => ({ ...idea, archived: false })),
      )
      if (seedError) {
        toast.error('Failed to seed ideas')
        setLoading(false)
        return
      }
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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const draggedId = String(active.id)
    const targetStatus = String(over.id) as IdeaStatus
    if (!IDEA_STATUSES.includes(targetStatus)) return

    const idea = ideas.find((i) => i.id === draggedId)
    if (!idea || idea.status === targetStatus) return

    setIdeas((prev) =>
      prev.map((i) => (i.id === draggedId ? { ...i, status: targetStatus } : i)),
    )

    const { error } = await supabase
      .from('business_ideas')
      .update({ status: targetStatus })
      .eq('id', draggedId)

    if (error) {
      toast.error('Failed to move idea')
      setIdeas((prev) =>
        prev.map((i) => (i.id === draggedId ? { ...i, status: idea.status } : i)),
      )
      return
    }
    toast.success(`Moved to ${IDEA_STATUS_LABELS[targetStatus]}`)
  }

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
    const { error } = await supabase.from('business_ideas').delete().eq('id', selectedIdea.id)
    if (error) {
      toast.error('Failed to delete idea')
      return
    }
    toast.success('Idea deleted')
    setDrawerOpen(false)
    fetchIdeas()
  }

  const filteredIdeas =
    filterDirection === 'all' ? ideas : ideas.filter((i) => i.direction === filterDirection)

  const activeIdea = activeId ? ideas.find((i) => i.id === activeId) ?? null : null

  const filterTabs: UnderlineTabOption<FilterValue>[] = [
    { value: 'all', label: 'ALL', hint: String(ideas.length) },
    ...IDEA_DIRECTIONS.map((d) => ({ value: d as FilterValue, label: d.toUpperCase() })),
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-72 animate-pulse bg-bg-hover" />
        <div className="overflow-x-auto -mx-4 px-4 md:-mx-8 md:px-8 snap-x snap-mandatory md:snap-none">
          <div className="flex gap-3 md:grid md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[85vw] shrink-0 snap-start md:w-auto h-[420px] animate-pulse bg-bg-hover" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Filter */}
      <UnderlineTabs<FilterValue>
        options={filterTabs}
        value={filterDirection}
        onChange={setFilterDirection}
      />

      {/* Kanban */}
      <div className="overflow-x-auto -mx-4 px-4 md:-mx-8 md:px-8 pb-2 snap-x snap-mandatory md:snap-none">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 md:grid md:grid-cols-4">
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
            {activeIdea ? (
              <div className="w-[260px] rotate-1">
                <CardBody idea={activeIdea} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Idea drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="!w-[420px] !rounded-none !border-l !border-border-strong !bg-bg-elevated !p-0 overflow-y-auto"
        >
          <SheetHeader className="border-b border-border px-5 py-3">
            <SheetTitle className="caption !font-mono !text-[11px] !uppercase !tracking-[0.08em] !text-text-2 flex items-center justify-between">
              <span>{isNew ? 'NEW_IDEA' : 'EDIT_IDEA'}</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-text-3 hover:text-text-1"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </SheetTitle>
            <SheetDescription className="font-mono text-[11px] text-text-3">
              &gt; {isNew ? 'add a new idea to the board' : 'update or manage'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 p-5">
            <label className="block space-y-1">
              <span className="caption text-text-2">TITLE</span>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="idea title..."
                className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="caption text-text-2">DESCRIPTION</span>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="brief description"
                className="block w-full resize-none border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="caption text-text-2">DIRECTION</span>
                <Select value={formDirection} onValueChange={(v) => setFormDirection(v as IdeaDirection)}>
                  <SelectTrigger className="h-8 rounded-none border-border bg-transparent font-mono text-[13px]">
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
              </label>
              <label className="block space-y-1">
                <span className="caption text-text-2">PRIORITY</span>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as IdeaPriority)}>
                  <SelectTrigger className="h-8 rounded-none border-border bg-transparent font-mono text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="caption text-text-2">STATUS</span>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as IdeaStatus)}>
                <SelectTrigger className="h-8 rounded-none border-border bg-transparent font-mono text-[13px]">
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
            </label>

            <label className="block space-y-1">
              <span className="caption text-text-2">NEXT ACTION</span>
              <input
                value={formNextAction}
                onChange={(e) => setFormNextAction(e.target.value)}
                placeholder="what's the next step?"
                className="block w-full border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="caption text-text-2">NOTES</span>
              <textarea
                rows={5}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="freeform notes, links, markdown..."
                className="block w-full resize-none border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-text-2 focus:outline-none"
              />
            </label>

            <div className="border-t border-border pt-3">
              {isNew ? (
                <button
                  onClick={handleCreate}
                  className="caption block w-full border border-text-1 bg-text-1 px-3 py-2 text-bg-base hover:bg-bg-base hover:text-text-1"
                >
                  CREATE IDEA
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleSave}
                    className="caption block w-full border border-text-1 bg-text-1 px-3 py-2 text-bg-base hover:bg-bg-base hover:text-text-1"
                  >
                    SAVE CHANGES
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={handleArchive}
                      className="caption flex flex-1 items-center justify-center gap-1.5 border border-border px-3 py-2 text-text-2 hover:border-text-1 hover:text-text-1"
                    >
                      <Archive className="h-3 w-3" strokeWidth={1.5} />
                      ARCHIVE
                    </button>
                    <button
                      onClick={handleDelete}
                      className="caption flex flex-1 items-center justify-center gap-1.5 border border-border px-3 py-2 text-text-2 hover:border-danger hover:text-danger"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      DELETE
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
