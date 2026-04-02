'use client'

import { type Card as CardType } from '@/lib/deck'
import { Card } from './Card'
import { CardSlot } from './CardSlot'

export type BoardProps = {
  board: CardType[]   // 0-5 cards dealt so far
  size?: 'sm' | 'md' // card size: 'sm' = mobile, 'md' = desktop. Default 'md'
}

export function Board({ board, size = 'md' }: BoardProps) {
  const gap = size === 'md' ? 10 : 6

  // Stagger delay for flop cards (indices 0-2) only.
  // Turn/river (index 3/4) appear instantly.
  const getDelay = (index: number): number => {
    if (index < 3 && board.length <= 3) return index * 0.16
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
          if (card) {
            // Key includes card identity so the component mounts fresh when a card
            // first appears, triggering the flip animation. Subsequent re-renders
            // (e.g. equity updates) keep the same key so the animation isn't interrupted.
            return (
              <Card
                key={`${i}-${card.r}${card.s}`}
                card={card}
                animate={true}
                delay={getDelay(i)}
                size={size}
              />
            )
          }
          return <CardSlot key={`empty-${i}`} size={size} />
        })}
      </div>
    </div>
  )
}
