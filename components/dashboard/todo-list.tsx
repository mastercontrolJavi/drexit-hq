'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
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

    if (!error && data) {
      setTodos(data)
    }
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
    const { error } = await supabase
      .from('todos')
      .insert({ title })

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
    <Card className="shadow-card">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Today&apos;s Todos
        </p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : todos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            All clear. Add a todo below.
          </p>
        ) : (
          <ul className="space-y-3">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-3 group active:scale-[0.98] transition-all duration-200"
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => completeTodo(todo.id)}
                />
                <span className="text-sm leading-tight">{todo.title}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-ios-gray-5">
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a todo..."
            className="text-sm"
            disabled={adding}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={addTodo}
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
