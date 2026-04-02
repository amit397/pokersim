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
  anchorRect?: DOMRect | null
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
  anchorRect,
}: CardPickerProps) {
  const deadSet = new Set(deadCards.map(cardKey))
  const outsSet = new Map<string, string>(
    (outsCards ?? []).map((c, i) => [cardKey(c), outsBeneficiary?.[i] ?? ''])
  )

  // Responsive cell sizing: shrink on narrow viewports so the grid always fits
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800
  const isMobile = vw < 560
  const cellW = isMobile ? 24 : 38
  const cellH = isMobile ? 33 : 50
  const cellGap = isMobile ? 2 : 4
  const pad = isMobile ? 10 : 20
  // Total picker dimensions (grid + padding + close button row)
  const pickerW = 13 * cellW + 12 * cellGap + pad * 2
  const pickerH = 4 * cellH + 3 * cellGap + pad * 2 + 28

  // Compute fixed position anchored near the clicked card, clamped to viewport
  const computePos = (): React.CSSProperties => {
    if (!anchorRect) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const margin = 8

    // Center horizontally on the card, prefer appearing above it
    let left = anchorRect.left + anchorRect.width / 2 - pickerW / 2
    let top = anchorRect.top - pickerH - 10

    // Clamp horizontal
    left = Math.max(margin, Math.min(left, vw - pickerW - margin))

    // If not enough room above, flip below
    if (top < margin) top = anchorRect.bottom + 10

    // Clamp vertical
    top = Math.max(margin, Math.min(top, vh - pickerH - margin))

    return { position: 'fixed', left, top }
  }

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
              background: 'rgba(7,22,10,0.7)',
              zIndex: 100,
            }}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              ...computePos(),
              zIndex: 101,
              background: 'var(--felt-mid)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: pad,
            }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            {/* Header row: close button sits in its own row, never overlaps the grid */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: isMobile ? 6 : 10,
            }}>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 4,
                  color: 'var(--ghost)',
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                  padding: isMobile ? '5px 9px' : '4px 8px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Grid: 4 suits × 13 ranks */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(13, ${cellW}px)`,
                gap: cellGap,
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
                        if (!isDead) onSelect(card)
                      }}
                      style={{
                        width: cellW,
                        height: cellH,
                        background: 'var(--ivory)',
                        borderRadius: 3,
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
                      <span style={{ fontSize: isMobile ? 9 : 11, lineHeight: 1 }}>{rankLabel(rank)}</span>
                      <span style={{ fontSize: isMobile ? 8 : 10, lineHeight: 1 }}>{SUIT_SYMBOLS[suit]}</span>
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
