'use client'

import { useEffect, useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { TodoItem } from '@/types'

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
    <section className="border border-border bg-bg-elevated">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="caption text-text-2">TODOS</span>
        <span className="font-mono text-[11px] text-text-3 tabular-nums">{todos.length}</span>
      </header>

      {loading ? (
        <ul>
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="border-b border-border px-4 py-2.5 last:border-b-0">
              <div className="h-4 w-3/4 bg-bg-hover animate-pulse" />
            </li>
          ))}
        </ul>
      ) : todos.length === 0 ? (
        <p className="font-mono text-xs text-text-3 px-4 py-6">
          &gt; all clear
        </p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="group flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-bg-hover transition-colors duration-200 ease-out-200"
            >
              <button
                onClick={() => completeTodo(todo.id)}
                className={cn(
                  'shrink-0 font-mono text-[13px] leading-none text-text-3 hover:text-text-1 focus:outline-none transition-colors',
                )}
                aria-label="Complete todo"
              >
                [ ]
              </button>
              <span className="flex-1 text-[13px] leading-tight text-text-1">{todo.title}</span>
            </li>
          ))}
        </ul>
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
          className="shrink-0 text-text-3 hover:text-text-1 disabled:opacity-40 transition-colors"
          aria-label="Add"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </section>
  )
}
