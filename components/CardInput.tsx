'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
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
  const deadSet = new Set(deadCards.map(cardKey))

  function shake() {
    setShaking(true)
    setTimeout(() => {
      setShaking(false)
      setValue(formatCards(cards)) // revert
    }, 600)
  }

  function handleBlur() {
    const parsed = parseCardString(value)
    if (!parsed) { shake(); return }
    // Check neither card is dead (excluding the current cards themselves)
    const currentKeys = new Set(cards.map(cardKey))
    const blockedByDead = parsed.some(c => deadSet.has(cardKey(c)) && !currentKeys.has(cardKey(c)))
    if (blockedByDead) { shake(); return }
    onChange(parsed)
    setValue(formatCards(parsed))
  }

  return (
    <motion.input
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={e => { if (e.key === 'Enter') handleBlur() }}
      animate={shaking ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        width: 80,
        background: 'var(--felt-mid)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 3,
        color: 'var(--parchment)',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11,
        textAlign: 'center',
        padding: '3px 6px',
        outline: 'none',
        marginTop: 4,
      }}
      placeholder="Ah Kd"
    />
  )
}
