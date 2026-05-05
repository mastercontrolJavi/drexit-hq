import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Caption / label
        '2xs': ['11px', { lineHeight: '16px', letterSpacing: '0.08em' }],
        // Display hero
        'display': ['56px', { lineHeight: '60px', letterSpacing: '-0.04em', fontWeight: '600' }],
      },
      colors: {
        // shadcn-compat
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",

        // Design-token aliases (preferred for new code)
        'bg-base':      'var(--bg-base)',
        'bg-elevated':  'var(--bg-elevated)',
        'bg-hover':     'var(--bg-hover)',
        'border-strong':'var(--border-strong)',
        'text-1':       'var(--text-1)',
        'text-2':       'var(--text-2)',
        'text-3':       'var(--text-3)',

        // Semantic — `accent` keeps shadcn nesting (DEFAULT/foreground) AND is overloaded
        // with the new accent semantics via --primary mapping. For NEW code use:
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        success: 'var(--success)',
        warn:    'var(--warn)',
        danger:  'var(--danger)',
      },
      borderRadius: {
        // 4px is the new max
        DEFAULT: '4px',
        none: '0',
        sm: '2px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
        full: '9999px',
      },
      // Drop shadows entirely — use hairlines via the design system. Keep 'none' for safety.
      boxShadow: {
        none: 'none',
        focus: '0 0 0 1px var(--accent)',
      },
      transitionTimingFunction: {
        'ease-out-200': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
export default config;
