'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function WeeklyFocus() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const lastSaved = useRef('')

  useEffect(() => {
    async function fetchFocus() {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'weekly_focus')
        .single()

      if (!error && data) {
        setText(data.value)
        lastSaved.current = data.value
      }
      setLoading(false)
    }
    fetchFocus()
  }, [])

  async function handleBlur() {
    const trimmed = text.trim()
    if (trimmed === lastSaved.current) return

    const { error } = await supabase.from('app_settings').upsert(
      {
        key: 'weekly_focus',
        value: trimmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )

    if (error) {
      toast.error('Failed to save focus')
    } else {
      lastSaved.current = trimmed
      toast.success('Focus saved')
    }
  }

  return (
    <section className="border border-border bg-bg-elevated">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="caption text-text-2">WEEKLY_FOCUS</span>
        <span className="caption text-text-3">AUTO_SAVE</span>
      </header>
      <div className="p-4">
        {loading ? (
          <div className="h-16 w-full animate-pulse bg-bg-hover" />
        ) : (
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            placeholder="> what is the single most important thing this week?"
            className="block w-full resize-none bg-transparent font-mono text-[13px] leading-5 text-text-1 placeholder:text-text-3 focus:outline-none"
            spellCheck={false}
          />
        )}
      </div>
    </section>
  )
}
