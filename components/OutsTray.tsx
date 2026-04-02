'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { type Card, SUIT_SYMBOLS, RED_SUITS, rankLabel, cardKey } from '@/lib/deck'

export type OutsTrayProps = {
  outs: Card[]
  outsBeneficiary: string[]   // parallel: player ID who benefits from each out
  playerColors: Record<string, { main: string; dim: string }>  // to get the glow color
  visible: boolean            // show after flop/turn, hide at preflop/river
}

export function OutsTray({ outs, outsBeneficiary, playerColors, visible }: OutsTrayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{ textAlign: 'center', marginBottom: 16 }}
        >
          {/* Label */}
          <p style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'var(--ghost)',
            marginBottom: 8,
          }}>
            {outs.length === 0
              ? 'No outs — current leader holds'
              : `${outs.length} out${outs.length === 1 ? '' : 's'} — cards that change the lead`}
          </p>

          {/* Mini card row */}
          {outs.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              justifyContent: 'center',
            }}>
              {outs.map((card, i) => {
                const beneficiary = outsBeneficiary[i] ?? 'hero'
                const ringColor = playerColors[beneficiary]?.main ?? 'var(--gold)'
                const isRed = RED_SUITS.has(card.s)

                return (
                  <div
                    key={`${cardKey(card)}-${i}`}
                    style={{
                      width: 28,
                      height: 38,
                      background: 'var(--ivory)',
                      borderRadius: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      padding: 2,
                      boxShadow: `0 0 0 2px ${ringColor}`,
                      color: isRed ? 'var(--red-suit)' : 'var(--black-suit)',
                      fontFamily: 'system-ui, sans-serif',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 9, lineHeight: 1 }}>{rankLabel(card.r)}</span>
                    <span style={{ fontSize: 8, lineHeight: 1 }}>{SUIT_SYMBOLS[card.s]}</span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
