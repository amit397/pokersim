'use client'

import { useRef } from 'react'
import { type Card as CardType } from '@/lib/deck'
import { Card } from './Card'
import { CardSlot } from './CardSlot'

export type BoardProps = {
  board: CardType[]   // 0-5 cards dealt so far
  size?: 'sm' | 'md' // card size: 'sm' = mobile, 'md' = desktop. Default 'md'
}

export function Board({ board, size = 'md' }: BoardProps) {
  // Track previously rendered card count so we only animate newly-dealt cards
  const prevCountRef = useRef(0)
  const prevCount = prevCountRef.current
  prevCountRef.current = board.length

  const gap = size === 'md' ? 10 : 6

  // Stagger delays: flop cards (0,1,2) get 0s, 0.16s, 0.32s stagger
  // Turn (index 3) and river (index 4) get no stagger
  const getDelay = (index: number): number => {
    if (index < 3 && prevCount === 0) return index * 0.16
    return 0
  }

  // Street label
  const streetLabel = (() => {
    if (board.length === 0) return 'Community Cards'
    if (board.length <= 3) return 'Flop'
    if (board.length === 4) return 'Turn'
    return 'River'
  })()

  return (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <p style={{
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 10,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: 'var(--ghost)',
        marginBottom: 10,
      }}>
        {streetLabel}
      </p>
      <div style={{ display: 'flex', gap, justifyContent: 'center' }}>
        {Array.from({ length: 5 }, (_, i) => {
          const card = board[i]
          const isNewlyDealt = card !== undefined && i >= prevCount
          if (card) {
            return (
              <Card
                key={i}
                card={card}
                animate={isNewlyDealt}
                delay={isNewlyDealt ? getDelay(i) : 0}
                size={size}
              />
            )
          }
          return <CardSlot key={i} size={size} />
        })}
      </div>
    </div>
  )
}
