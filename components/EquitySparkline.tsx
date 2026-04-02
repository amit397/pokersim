'use client'

import { motion, AnimatePresence } from 'framer-motion'

export type SparklinePlayer = {
  id: string
  label: string
  color: string  // CSS variable string e.g. 'var(--gold)'
}

export type EquitySparklineProps = {
  equityHistory: number[][]   // [streetIdx][playerIdx] — up to 4 streets
  players: SparklinePlayer[]
}

// Layout constants
const PAD_LEFT = 36   // space for Y-axis labels
const PAD_RIGHT = 8
const PAD_TOP = 12
const PAD_BOTTOM = 24  // space for X-axis labels
const CHART_W = 300
const CHART_H = 120
const TOTAL_W = CHART_W + PAD_LEFT + PAD_RIGHT
const TOTAL_H = CHART_H + PAD_TOP + PAD_BOTTOM

const X_STOPS = [0, 1, 2, 3]  // street indices
const STREET_LABELS = ['Pre', 'Flop', 'Turn', 'River']
const Y_TICKS = [0, 50, 100]

function xPos(streetIdx: number): number {
  return PAD_LEFT + (streetIdx / 3) * CHART_W
}

function yPos(equity: number): number {
  // 100% → top (PAD_TOP), 0% → bottom (PAD_TOP + CHART_H)
  return PAD_TOP + (1 - equity / 100) * CHART_H
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
}

export function EquitySparkline({ equityHistory, players }: EquitySparklineProps) {
  // Only show after all streets are dealt (4 equity snapshots)
  const isComplete = equityHistory.length === 4

  return (
    <AnimatePresence>
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ width: '100%', marginBottom: 16 }}
        >
          <svg
            width="100%"
            viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', overflow: 'visible' }}
          >
            {/* Y-axis gridlines + labels */}
            {Y_TICKS.map(pct => {
              const y = yPos(pct)
              return (
                <g key={pct}>
                  <line
                    x1={PAD_LEFT}
                    y1={y}
                    x2={PAD_LEFT + CHART_W}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD_LEFT - 6}
                    y={y + 4}
                    textAnchor="end"
                    style={{
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: 9,
                      fill: 'var(--ghost)',
                    }}
                  >
                    {pct}%
                  </text>
                </g>
              )
            })}

            {/* X-axis vertical guide lines + labels */}
            {X_STOPS.map(i => {
              const x = xPos(i)
              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1={PAD_TOP}
                    x2={x}
                    y2={PAD_TOP + CHART_H}
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={TOTAL_H - 4}
                    textAnchor="middle"
                    style={{
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: 9,
                      fill: 'var(--ghost)',
                    }}
                  >
                    {STREET_LABELS[i]}
                  </text>
                </g>
              )
            })}

            {/* One line per player */}
            {players.map((player, playerIdx) => {
              const points = equityHistory
                .map((streetEquities, streetIdx) => ({
                  x: xPos(streetIdx),
                  y: yPos(streetEquities[playerIdx] ?? 0),
                }))

              const pathD = buildPath(points)
              if (!pathD) return null

              return (
                <g key={player.id}>
                  {/* Line */}
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke={player.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      pathLength: { duration: 0.7, ease: 'easeOut', delay: playerIdx * 0.08 },
                      opacity: { duration: 0.3 },
                    }}
                  />

                  {/* Data point dots */}
                  {points.map((p, streetIdx) => (
                    <motion.circle
                      key={streetIdx}
                      cx={p.x}
                      cy={p.y}
                      r={3.5}
                      fill={player.color}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + playerIdx * 0.08 + streetIdx * 0.05, duration: 0.2 }}
                    />
                  ))}
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '8px 16px',
            marginTop: 4,
          }}>
            {players.map(player => (
              <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 20,
                  height: 2,
                  background: player.color,
                  borderRadius: 1,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 9,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'var(--ghost)',
                }}>
                  {player.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
