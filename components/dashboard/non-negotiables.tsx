'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { NonNegotiable } from '@/types'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function NonNegotiables() {
  const [items, setItems] = useState<NonNegotiable[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    const { data, error } = await supabase
      .from('non_negotiables')
      .select('id, title, sort_order, last_completed_date, active')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (!error && data) {
      setItems(data as NonNegotiable[])
    }
    setLoading(false)
  }

  async function toggleItem(item: NonNegotiable) {
    const today = todayISO()
    const isDone = item.last_completed_date === today
    const newDate = isDone ? null : today

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, last_completed_date: newDate } : i))
    )

    const { error } = await supabase
      .from('non_negotiables')
      .update({ last_completed_date: newDate })
      .eq('id', item.id)

    if (error) {
      toast.error('Failed to update')
      fetchItems()
    }
  }

  async function addItem() {
    const title = newTitle.trim()
    if (!title) return

    setAdding(true)
    const { data, error } = await supabase
      .from('non_negotiables')
      .insert({ title, sort_order: items.length })
      .select('id, title, sort_order, last_completed_date, active')
      .single()

    if (error) {
      toast.error('Failed to add item')
    } else if (data) {
      setItems((prev) => [...prev, data as NonNegotiable])
      setNewTitle('')
    }
    setAdding(false)
    inputRef.current?.focus()
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))

    const { error } = await supabase
      .from('non_negotiables')
      .update({ active: false })
      .eq('id', id)

    if (error) {
      toast.error('Failed to remove item')
      fetchItems()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }

  const today = todayISO()
  const winsCount = items.filter((i) => i.last_completed_date === today).length
  const allDone = items.length > 0 && winsCount === items.length

  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Non-Negotiables
          </p>
          {items.length > 0 && (
            <span
              className={cn(
                'text-xs font-semibold tabular-nums',
                allDone ? 'text-ios-green' : 'text-muted-foreground'
              )}
            >
              {winsCount}/{items.length} wins
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Add your daily non-negotiables below.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => {
              const done = item.last_completed_date === today
              return (
                <li
                  key={item.id}
                  className="group flex items-center gap-3 active:scale-[0.98] transition-transform duration-150"
                >
                  <button
                    onClick={() => toggleItem(item)}
                    className="shrink-0 focus:outline-none"
                    aria-label={done ? 'Unmark as done' : 'Mark as done'}
                  >
                    {done ? (
                      <CheckCircle2 className="h-[18px] w-[18px] text-ios-green" />
                    ) : (
                      <Circle className="h-[18px] w-[18px] text-muted-foreground/50" />
                    )}
                  </button>
                  <span
                    className={cn(
                      'flex-1 text-sm leading-tight',
                      done && 'line-through text-muted-foreground'
                    )}
                  >
                    {item.title}
                  </span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="invisible group-hover:visible shrink-0 text-muted-foreground/40 hover:text-ios-red transition-colors focus:outline-none"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-ios-gray-5">
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a non-negotiable..."
            className="text-sm"
            disabled={adding}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={addItem}
            disabled={adding || !newTitle.trim()}
            className="shrink-0 active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
