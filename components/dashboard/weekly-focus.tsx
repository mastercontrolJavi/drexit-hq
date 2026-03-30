'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'weekly_focus',
          value: trimmed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

    if (error) {
      toast.error('Failed to save focus')
    } else {
      lastSaved.current = trimmed
      toast.success('Focus saved')
    }
  }

  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          This Week&apos;s Focus
        </p>

        {loading ? (
          <Skeleton className="h-20 w-full rounded-lg" />
        ) : (
          <Textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            placeholder="What are you focused on this week?"
            className="resize-none text-sm"
          />
        )}
      </CardContent>
    </Card>
  )
}
