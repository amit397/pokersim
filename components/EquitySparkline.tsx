'use client'

import { motion } from 'framer-motion'
import { useRef } from 'react'

export type EquitySparklineProps = {
  history: number[]   // Hero's equity at each street: [preflop, flop?, turn?, river?] — 1 to 4 values
}

const VIEW_W = 300
const VIEW_H = 48
const LABEL_H = 14  // space below chart for axis labels
const CHART_H = VIEW_H - LABEL_H
const X_POSITIONS = [0, 100, 200, 300]  // x coords for Pre, Flop, Turn, River
const STREET_LABELS = ['Pre', 'Flop', 'Turn', 'River']

export function EquitySparkline({ history }: EquitySparklineProps) {
  const prevLengthRef = useRef(history.length)
  const prevLength = prevLengthRef.current
  prevLengthRef.current = history.length

  if (history.length === 0) return null

  // Map equity value (0-100) to SVG y coordinate (inverted: 100% = top = 0, 0% = bottom = CHART_H)
  function toY(equity: number): number {
    return CHART_H * (1 - equity / 100)
  }

  // Build SVG path string for all current history points
  const points = history.map((eq, i) => ({
    x: X_POSITIONS[i],
    y: toY(eq),
  }))

  const pathD = points.length < 2 ? '' :
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Detect bad beat: latest equity drop > 40 points
  const isBadBeat = history.length >= 2 &&
    (history[history.length - 2] - history[history.length - 1]) > 40

  // For animation: ratio of path length covered by previous points
  const prevRatio = history.length > 1 && prevLength > 0
    ? (prevLength - 1) / (history.length - 1)
    : 0

  return (
    <div style={{ width: '100%', marginTop: 8 }}>
      <svg
        width="100%"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Axis labels */}
        {STREET_LABELS.slice(0, Math.min(history.length + 1, 4)).map((label, i) => (
          <text
            key={label}
            x={X_POSITIONS[i]}
            y={VIEW_H}
            textAnchor="middle"
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 10,
              fill: 'var(--ghost)',
            }}
          >
            {label}
          </text>
        ))}

        {/* Animated path */}
        {pathD && (
          <motion.path
            d={pathD}
            fill="none"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: prevRatio, stroke: isBadBeat ? 'var(--red-suit)' : 'var(--gold)' }}
            animate={{ pathLength: 1, stroke: 'var(--gold)' }}
            transition={{
              pathLength: { duration: 0.4, ease: 'easeOut' },
              stroke: isBadBeat ? { delay: 0.4, duration: 0.8 } : { duration: 0 },
            }}
          />
        )}

        {/* Data point dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="var(--gold)"
          />
        ))}
      </svg>
    </div>
  )
}
