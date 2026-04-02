'use client'

import { motion } from 'framer-motion'
import { type Card as CardType, SUIT_SYMBOLS, RED_SUITS, rankLabel } from '@/lib/deck'

export type CardSize = 'sm' | 'md'

export type CardProps = {
  card: CardType
  animate?: boolean      // true = flip in with animation, false = render static
  delay?: number         // stagger delay in seconds (e.g. 0.16 for flop stagger)
  size?: CardSize        // 'sm' = 52×73px (mobile), 'md' = 70×98px (desktop). Default 'md'
  interactive?: boolean  // true = hover lift + pointer cursor (for hole cards)
  onClick?: () => void
}

const SIZES = {
  md: { width: 70, height: 98, borderRadius: 8, rankSize: 16, suitSmall: 11, suitCenter: 30, padding: 5 },
  sm: { width: 52, height: 73, borderRadius: 6, rankSize: 12, suitSmall:  9, suitCenter: 22, padding: 4 },
}

export function Card({ card, animate = false, delay = 0, size = 'md', interactive = false, onClick }: CardProps) {
  const dim = SIZES[size]
  const isRed = RED_SUITS.has(card.s)
  const textColor = isRed ? 'var(--red-suit)' : 'var(--black-suit)'
  const suitSymbol = SUIT_SYMBOLS[card.s]
  const rank = rankLabel(card.r)

  const cardStyle: React.CSSProperties = {
    width: dim.width,
    height: dim.height,
    borderRadius: dim.borderRadius,
    backgroundColor: 'var(--ivory)',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
    padding: dim.padding,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    cursor: interactive ? 'pointer' : 'default',
    userSelect: 'none',
  }

  const cornerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: 1,
    color: textColor,
  }

  const motionProps = animate
    ? {
        initial: { rotateY: 90, scale: 0.88, opacity: 0 },
        animate: { rotateY: 0, scale: 1, opacity: 1 },
        transition: { duration: 0.38, ease: [0.23, 1, 0.32, 1] as [number, number, number, number], delay },
      }
    : {}

  const hoverProps = interactive
    ? {
        whileHover: {
          scale: 1.05,
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08), 0 0 12px rgba(184,148,58,0.25)',
        },
        whileTap: { scale: 0.98 },
      }
    : {}

  return (
    <motion.div
      style={cardStyle}
      onClick={interactive ? onClick : undefined}
      {...motionProps}
      {...hoverProps}
    >
      {/* Top-left corner */}
      <div style={cornerStyle}>
        <span style={{ fontSize: dim.rankSize, fontWeight: 700, lineHeight: 1 }}>{rank}</span>
        <span style={{ fontSize: dim.suitSmall, lineHeight: 1 }}>{suitSymbol}</span>
      </div>

      {/* Center suit */}
      <span style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: dim.suitCenter,
        color: textColor,
        opacity: 1,
        lineHeight: 1,
        pointerEvents: 'none',
      }}>
        {suitSymbol}
      </span>

      {/* Bottom-right corner (rotated 180°) */}
      <div style={{
        ...cornerStyle,
        position: 'absolute',
        bottom: dim.padding,
        right: dim.padding,
        transform: 'rotate(180deg)',
      }}>
        <span style={{ fontSize: dim.rankSize, fontWeight: 700, lineHeight: 1 }}>{rank}</span>
        <span style={{ fontSize: dim.suitSmall, lineHeight: 1 }}>{suitSymbol}</span>
      </div>
    </motion.div>
  )
}
