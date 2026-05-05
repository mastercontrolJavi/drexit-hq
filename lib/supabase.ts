import { createClient } from '@supabase/supabase-js'
import { createMockClient } from './supabase-mock'

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// In demo mode the mock client serves fixture data and toasts on writes.
// No Supabase credentials are needed.
export const supabase = isDemoMode
  ? (createMockClient() as unknown as ReturnType<typeof createClient>)
  : createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
