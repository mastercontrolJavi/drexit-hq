'use client'

import { motion } from 'framer-motion'
import { route } from '@/lib/motion'

/**
 * Route transition. Only the page body moves. The sidebar, ticker strip and
 * page header live in the layout and stay pinned, which is the whole point:
 * the frame is the instrument, the content is what changes.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <motion.div {...route}>{children}</motion.div>
}
