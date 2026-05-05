'use client'

import { useEffect, useState, useRef } from 'react'
import { X, Plus } from 'lucide-react'
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
    <section className="border border-border bg-bg-elevated">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="caption text-text-2">NON_NEGOTIABLES</span>
        {items.length > 0 && (
          <span
            className={cn(
              'font-mono text-[11px] tabular-nums',
              allDone ? 'text-success' : 'text-text-3',
            )}
          >
            {winsCount}/{items.length}
          </span>
        )}
      </header>

      {loading ? (
        <ul>
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="border-b border-border px-4 py-2.5 last:border-b-0">
              <div className="h-4 w-2/3 bg-bg-hover animate-pulse" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="font-mono text-xs text-text-3 px-4 py-6">
          &gt; no non-negotiables yet
        </p>
      ) : (
        <ul>
          {items.map((item) => {
            const done = item.last_completed_date === today
            return (
              <li
                key={item.id}
                className="group flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-bg-hover transition-colors duration-200 ease-out-200"
              >
                <button
                  onClick={() => toggleItem(item)}
                  className={cn(
                    'shrink-0 font-mono text-[13px] leading-none focus:outline-none transition-colors',
                    done ? 'text-success' : 'text-text-3 hover:text-text-1',
                  )}
                  aria-label={done ? 'Unmark as done' : 'Mark as done'}
                >
                  {done ? '[x]' : '[ ]'}
                </button>
                <span
                  className={cn(
                    'flex-1 text-[13px] leading-tight',
                    done ? 'line-through text-text-3' : 'text-text-1',
                  )}
                >
                  {item.title}
                </span>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="invisible shrink-0 text-text-3 hover:text-danger group-hover:visible focus:outline-none focus:visible:visible"
                  aria-label="Remove item"
                >
                  <X className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <span className="font-mono text-xs text-text-3">&gt;</span>
        <input
          ref={inputRef}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="add non-negotiable..."
          className="flex-1 bg-transparent font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none"
          disabled={adding}
          spellCheck={false}
        />
        <button
          onClick={addItem}
          disabled={adding || !newTitle.trim()}
          className="shrink-0 text-text-3 hover:text-text-1 disabled:opacity-40 transition-colors"
          aria-label="Add"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </section>
  )
}
