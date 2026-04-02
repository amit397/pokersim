'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export type PlayerEquity = {
  id: string
  equity: number      // 0-100
  color: string       // CSS variable string, e.g. 'var(--gold)'
  label: string
}

export type EquityBarProps = {
  players: PlayerEquity[]
  previousEquity?: number[]  // previous frame's equity values for detecting dramatic swings
}

const SPRING = { type: 'spring', stiffness: 80, damping: 14 } as const

export function EquityBar({ players, previousEquity }: EquityBarProps) {
  const [isFlash, setIsFlash] = useState(false)
  const [extremePulse, setExtremePulse] = useState<'low' | 'high' | null>(null)

  const heroEquity = players[0]?.equity ?? 50
  const isSegmented = players.length > 2

  // Detect dramatic swing (>25% change in any player)
  useEffect(() => {
    if (!previousEquity) return
    const maxDelta = players.reduce((max, p, i) => {
      const prev = previousEquity[i] ?? p.equity
      return Math.max(max, Math.abs(p.equity - prev))
    }, 0)
    if (maxDelta > 25) {
      setIsFlash(true)
      const t = setTimeout(() => setIsFlash(false), 120)
      return () => clearTimeout(t)
    }
  }, [players, previousEquity])

  // Detect extreme equity for Hero
  useEffect(() => {
    if (heroEquity < 15) {
      setExtremePulse('low')
      const t = setTimeout(() => setExtremePulse(null), 300)
      return () => clearTimeout(t)
    } else if (heroEquity > 85) {
      setExtremePulse('high')
      const t = setTimeout(() => setExtremePulse(null), 300)
      return () => clearTimeout(t)
    }
  }, [heroEquity])

  const containerStyle: React.CSSProperties = {
    height: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  }

  if (!isSegmented) {
    // Binary mode: single gold fill from left
    return (
      <div style={containerStyle}>
        <motion.div
          style={{
            height: '100%',
            borderRadius: 6,
            backgroundColor: extremePulse === 'low' ? 'var(--red-suit)' : 'var(--gold)',
          }}
          animate={{
            width: `${players[0]?.equity ?? 50}%`,
            filter: isFlash ? 'brightness(1.6)' : extremePulse === 'high' ? 'brightness(1.8)' : 'brightness(1)',
          }}
          transition={SPRING}
        />
      </div>
    )
  }

  // Segmented mode: one segment per player
  return (
    <div style={{ ...containerStyle, display: 'flex' }}>
      {players.map((p, i) => {
        const isFirst = i === 0
        const isLast = i === players.length - 1
        return (
          <motion.div
            key={p.id}
            style={{
              height: '100%',
              backgroundColor: p.color,
              borderRadius: isFirst ? '6px 0 0 6px' : isLast ? '0 6px 6px 0' : 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0,
            }}
            animate={{
              width: `${p.equity}%`,
              filter: isFlash ? 'brightness(1.6)' : 'brightness(1)',
            }}
            transition={SPRING}
          >
            {/* Inline label if segment is wide enough — controlled by parent via CSS */}
            <span style={{
              fontSize: 9,
              fontFamily: 'var(--font-mono), monospace',
              color: 'rgba(255,255,255,0.8)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              pointerEvents: 'none',
            }}>
              {p.equity >= 15 ? `${Math.round(p.equity)}%` : ''}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
