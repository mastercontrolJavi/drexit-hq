'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'drexit-boot-shown'

export function useBootSequence() {
  // Default to false — only flip true after we confirm sessionStorage is empty,
  // so the boot UI never shows on subsequent navigations within a session.
  const [shouldShow, setShouldShow] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem(STORAGE_KEY) === '1'
    if (!seen) setShouldShow(true)
    setHydrated(true)
  }, [])

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1')
    setShouldShow(false)
  }

  return { shouldShow: hydrated && shouldShow, dismiss }
}
