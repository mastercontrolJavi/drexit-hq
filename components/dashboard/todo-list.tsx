'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { TodoItem } from '@/types'
import { SkeletonRows } from '@/components/data/skeleton'
import { EmptyState } from '@/components/data/empty-state'
import { DUR, EASE_OUT, listContainer, listItem } from '@/lib/motion'
import { Panel } from '@/components/data/panel'

export function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchTodos()
  }, [])

  async function fetchTodos() {
    const { data, error } = await supabase
      .from('todos')
      .select('id, title, completed')
      .eq('completed', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!error && data) setTodos(data)
    setLoading(false)
  }

  async function completeTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))

    const { error } = await supabase
      .from('todos')
      .update({ completed: true })
      .eq('id', id)

    if (error) {
      toast.error('Failed to complete todo')
      fetchTodos()
    } else {
      toast.success('Todo completed')
    }
  }

  async function addTodo() {
    const title = newTitle.trim()
    if (!title) return

    setAdding(true)
    const { error } = await supabase.from('todos').insert({ title })

    if (error) {
      toast.error('Failed to add todo')
    } else {
      toast.success('Todo added')
      setNewTitle('')
      fetchTodos()
    }
    setAdding(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTodo()
    }
  }

  return (
    <Panel>
      <Panel.Header>
        <Panel.Title>TODOS</Panel.Title>
        <span className="font-mono text-[11px] text-text-3 tabular-nums">{todos.length}</span>
      </Panel.Header>

      {loading ? (
        <SkeletonRows count={3} />
      ) : todos.length === 0 ? (
        <EmptyState variant="flush">all clear</EmptyState>
      ) : (
        <motion.ul variants={listContainer} initial="hidden" animate="show">
          <AnimatePresence initial={false}>
            {todos.map((todo) => (
              <motion.li
                key={todo.id}
                variants={listItem}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: DUR.fast, ease: EASE_OUT }}
                className="group flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-bg-hover transition-colors duration-150 ease-out-200"
              >
                <button
                  onClick={() => completeTodo(todo.id)}
                  className={cn(
                    'shrink-0 font-mono text-[13px] leading-none text-text-3 transition-colors duration-150 ease-out-200 hover:text-text-1',
                  )}
                  aria-label="Complete todo"
                >
                  [ ]
                </button>
                <span
                  className="min-w-0 flex-1 truncate text-[13px] leading-tight text-text-1"
                  title={todo.title}
                >
                  {todo.title}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <span className="font-mono text-xs text-text-3">&gt;</span>
        <input
          ref={inputRef}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="add todo..."
          className="flex-1 bg-transparent font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none"
          disabled={adding}
          spellCheck={false}
        />
        <button
          onClick={addTodo}
          disabled={adding || !newTitle.trim()}
          className="shrink-0 text-text-3 hover:text-text-1 disabled:opacity-40 transition-colors duration-150 ease-out-200"
          aria-label="Add"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </Panel>
  )
}
