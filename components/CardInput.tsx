'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Card, cardKey } from '@/lib/deck'
import { parseCardString, formatCards } from '@/lib/parseCards'

export type CardInputProps = {
  cards: [Card, Card]
  onChange: (newCards: [Card, Card]) => void
  deadCards: Card[]
}

export function CardInput({ cards, onChange, deadCards }: CardInputProps) {
  const [value, setValue] = useState(formatCards(cards))
  const [shaking, setShaking] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const deadSet = new Set(deadCards.map(cardKey))

  const showTooltip = hovered || focused

  function shake() {
    setShaking(true)
    setTimeout(() => {
      setShaking(false)
      setValue(formatCards(cards))
    }, 600)
  }

  function handleBlur() {
    setFocused(false)
    const parsed = parseCardString(value)
    if (!parsed) { shake(); return }
    const currentKeys = new Set(cards.map(cardKey))
    const blockedByDead = parsed.some(c => deadSet.has(cardKey(c)) && !currentKeys.has(cardKey(c)))
    if (blockedByDead) { shake(); return }
    onChange(parsed)
    setValue(formatCards(parsed))
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <motion.input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        onFocus={() => setFocused(true)}
        onKeyDown={e => { if (e.key === 'Enter') handleBlur() }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        animate={shaking ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          width: 80,
          background: 'var(--felt-mid)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 3,
          color: 'var(--ivory)',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 11,
          textAlign: 'center',
          padding: '3px 6px',
          outline: 'none',
          marginTop: 4,
          cursor: 'text',
        }}
        placeholder="Ah Kd"
      />

      {/* Tooltip — x: '-50%' lets Framer Motion handle centering without CSS transform conflict */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 6, x: '-50%' }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              left: '50%',
              width: 240,
              background: '#0a1a0d',
              border: '1px solid rgba(184,148,58,0.3)',
              borderRadius: 6,
              padding: '12px 14px',
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            {/* Arrow */}
            <div style={{
              position: 'absolute',
              bottom: -5,
              left: '50%',
              marginLeft: -4,
              width: 8,
              height: 8,
              background: '#0a1a0d',
              border: '1px solid rgba(184,148,58,0.3)',
              borderTop: 'none',
              borderLeft: 'none',
              transform: 'rotate(45deg)',
            }} />

            {/* Text shorthand section */}
            <p style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: 'var(--gold)',
              margin: '0 0 8px 0',
            }}>
              Text shorthand
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {[
                ['Ace of Spades', 'As'],
                ['King of Hearts', 'Kh'],
                ['9 of Clubs', '9c'],
                ['Ten of Diamonds', 'Td'],
              ].map(([name, code]) => (
                <div key={code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, color: 'var(--parchment)' }}>
                    {name}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--gold)',
                    marginLeft: 10,
                  }}>
                    {code}
                  </span>
                </div>
              ))}
            </div>

            <p style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 10,
              color: 'var(--ghost)',
              margin: '0 0 10px 0',
            }}>
              Suits: s ♠  h ♥  d ♦  c ♣
            </p>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 10px 0' }} />

            {/* Card picker section */}
            <p style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: 'var(--gold)',
              margin: '0 0 6px 0',
            }}>
              Visual picker
            </p>
            <p style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 11,
              color: 'var(--parchment)',
              margin: 0,
              lineHeight: 1.5,
            }}>
              Click any card above to open the full card picker
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
