# AXIS_OS

Personal command center — budget, fitness, goals, and business ideas in one terminal-aesthetic dashboard

## Built With

- **Next.js 14** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Base UI)
- **Supabase** (PostgreSQL)
- **Recharts**, **date-fns**, **dnd-kit**

## Features

- **Budget tracker** — CSV import, savings goals, analytics
- **Fitness tracker** — weight, BMI, body composition
- **Goal timeline** — progress tracking across life areas
- **Business idea kanban** — direction, priority, status board
- **Command palette** — ⌘K quick navigation
- **PWA support** — installable on mobile/desktop
- **Dark/light mode**
- **Demo mode** — read-only fixture data, no account required

## Live Demo

[your-url-here]

## Getting Started

```bash
npm install
cp .env.local.example .env.local
# Fill in your Supabase credentials in .env.local
npm run dev
```

## Demo Mode

```bash
NEXT_PUBLIC_DEMO_MODE=true npm run dev
```

---

Built with [Claude Code](https://claude.ai/code) + Cursor as primary development tools. AI-assisted workflow.
