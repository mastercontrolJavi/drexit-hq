'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_MONTHLY_INCOME } from '@/types'
import { toast } from 'sonner'

export function useIncome() {
  const [income, setIncome] = useState(DEFAULT_MONTHLY_INCOME)
  const [loading, setLoading] = useState(true)

  const fetchIncome = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'monthly_income')
      .single()

    if (!error && data) {
      setIncome(Number(data.value))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIncome()
  }, [fetchIncome])

  const updateIncome = useCallback(async (amount: number) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: 'monthly_income', value: String(amount), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )

    if (error) {
      toast.error('Failed to update income')
      return
    }

    setIncome(amount)
    toast.success('Income updated')
  }, [])

  return { income, loading: loading, updateIncome }
}
