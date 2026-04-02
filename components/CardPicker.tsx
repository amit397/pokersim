'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { type Card, type Suit, SUIT_SYMBOLS, RED_SUITS, rankLabel, cardKey } from '@/lib/deck'

export type CardPickerProps = {
  isOpen: boolean
  onSelect: (card: Card) => void
  onClose: () => void
  deadCards: Card[]
  currentCard: Card | null
  playerColor: string
  outsCards?: Card[]
  outsBeneficiary?: string[]
  playerColors?: Record<string, { main: string; dim: string }>
}

const SUITS: Suit[] = ['s', 'h', 'd', 'c']
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export function CardPicker({
  isOpen,
  onSelect,
  onClose,
  deadCards,
  currentCard,
  playerColor,
  outsCards,
  outsBeneficiary,
  playerColors,
}: CardPickerProps) {
  const deadSet = new Set(deadCards.map(cardKey))
  const outsSet = new Map<string, string>(
    (outsCards ?? []).map((c, i) => [cardKey(c), outsBeneficiary?.[i] ?? ''])
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(7,22,10,0.85)',
              zIndex: 100,
            }}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              zIndex: 101,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--felt-mid)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: 20,
              maxWidth: '95vw',
              maxHeight: '95vh',
              overflow: 'auto',
            }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'transparent',
                border: 'none',
                color: 'var(--ghost)',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            {/* Grid: 4 suits × 13 ranks */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(13, auto)',
                gap: 4,
                marginTop: 8,
              }}
            >
              {SUITS.map(suit =>
                RANKS.map(rank => {
                  const card: Card = { r: rank, s: suit }
                  const key = cardKey(card)
                  const isDead = deadSet.has(key)
                  const isCurrent = currentCard ? cardKey(currentCard) === key : false
                  const outIdx = outsSet.get(key)
                  const isRed = RED_SUITS.has(suit)

                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (!isDead) {
                          onSelect(card)
                        }
                      }}
                      style={{
                        width: 40,
                        height: 54,
                        background: 'var(--ivory)',
                        borderRadius: 4,
                        border: isCurrent
                          ? `2px solid ${playerColor}`
                          : '1px solid transparent',
                        boxShadow:
                          outIdx !== undefined && !isDead
                            ? `0 0 0 2px ${playerColors?.[outIdx]?.main ?? 'var(--gold)'}`
                            : isCurrent
                            ? `0 0 8px rgba(184,148,58,0.3)`
                            : 'none',
                        cursor: isDead ? 'not-allowed' : 'pointer',
                        opacity: isDead ? 0.2 : 1,
                        pointerEvents: isDead ? 'none' : 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        padding: 2,
                        transition: 'filter 0.1s',
                        color: isRed ? 'var(--red-suit)' : 'var(--black-suit)',
                        fontFamily: 'system-ui, sans-serif',
                        fontWeight: 700,
                      }}
                      onMouseEnter={e => {
                        if (!isDead)
                          (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.filter = 'none'
                      }}
                    >
                      <span style={{ fontSize: 11, lineHeight: 1 }}>{rankLabel(rank)}</span>
                      <span style={{ fontSize: 10, lineHeight: 1 }}>{SUIT_SYMBOLS[suit]}</span>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
