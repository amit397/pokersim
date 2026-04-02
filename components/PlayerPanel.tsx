'use client'

import { type Card as CardType } from '@/lib/deck'
import { Card } from './Card'
import { EquityNumber } from './EquityNumber'
import { CardInput } from './CardInput'

export type PlayerPanelProps = {
  id: string
  label: string
  cards: [CardType, CardType]
  equity: number
  color: string          // CSS variable string e.g. 'var(--gold)'
  isCalculating: boolean
  isHero: boolean
  size?: 'sm' | 'md'    // card size
  onCardClick: (cardIndex: 0 | 1, rect: DOMRect) => void
  onRemove?: () => void
  deadCards?: CardType[]
  onCardsChange?: (newCards: [CardType, CardType]) => void
}

export function PlayerPanel({
  id,
  label,
  cards,
  equity,
  color,
  isCalculating,
  isHero,
  size = 'md',
  onCardClick,
  onRemove,
  deadCards = [],
  onCardsChange,
}: PlayerPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative', flex: 1 }}>
      {/* Remove button — top right, non-hero only */}
      {!isHero && onRemove && (
        <button
          onClick={onRemove}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent',
            color: 'var(--ghost)',
            cursor: 'pointer',
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            padding: 0,
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--parchment)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.4)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--ghost)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'
          }}
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}

      {/* Player label */}
      <div style={{
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 10,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color,
      }}>
        {label}
      </div>

      {/* Hole cards */}
      <div style={{ display: 'flex', gap: 7 }}>
        {cards.map((card, i) => (
          <div
            key={i}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
              onCardClick(i as 0 | 1, rect)
            }}
          >
            <Card
              card={card}
              animate={false}
              size={size}
              interactive={true}
            />
          </div>
        ))}
      </div>

      {/* Equity number */}
      <EquityNumber value={equity} color={color} size="md" isCalculating={isCalculating} />

      {/* Text shorthand input */}
      {onCardsChange && (
        <CardInput cards={cards} onChange={onCardsChange} deadCards={deadCards} />
      )}
    </div>
  )
}
