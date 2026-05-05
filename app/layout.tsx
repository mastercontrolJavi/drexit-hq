import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from 'sonner'
import { Providers } from '@/components/shell/providers'
import { Ticker } from '@/components/shell/ticker'
import { BootSequence } from '@/components/shell/boot-sequence'
import { CommandPalette } from '@/components/shell/command-palette'

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AXIS_OS',
  description: 'Personal command center — budget, goals, fitness, ideas.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable}`}
    >
      <body>
        <Providers>
          <BootSequence />
          <div className="flex h-screen overflow-hidden bg-bg-base">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Ticker />
              <main className="flex-1 overflow-y-auto bg-grid-dots">
                <div className="px-8 py-8">{children}</div>
              </main>
            </div>
          </div>
          <CommandPalette />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '4px',
                color: 'var(--text-1)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
