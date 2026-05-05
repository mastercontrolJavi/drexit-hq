import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  stroke?: string
  className?: string
  /** Draw a baseline at y=0 (for series that can go negative). */
  zeroBaseline?: boolean
}

export function Sparkline({
  data,
  width = 80,
  height = 20,
  stroke = 'currentColor',
  className,
  zeroBaseline = false,
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={cn('text-text-3', className)}
        aria-hidden
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.4}
        />
      </svg>
    )
  }

  const min = Math.min(...data, zeroBaseline ? 0 : Infinity)
  const max = Math.max(...data, zeroBaseline ? 0 : -Infinity)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  const points = data
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / range) * height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn(className)}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
