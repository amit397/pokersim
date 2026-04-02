'use client'

import { useSpring, useTransform, motion } from 'framer-motion'
import { useEffect } from 'react'

export type EquityNumberProps = {
  value: number           // 0-100
  color: string           // CSS variable string, e.g. 'var(--gold)'
  size?: 'lg' | 'md'     // 'lg' = 64px desktop / 48px mobile, 'md' = 32px
  isCalculating?: boolean // show subtle pulse animation when true
}

export function EquityNumber({ value, color, size = 'lg', isCalculating = false }: EquityNumberProps) {
  const spring = useSpring(value, { stiffness: 80, damping: 20 })
  const display = useTransform(spring, (v) => Math.round(v))

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  const fontSize = size === 'lg' ? 'clamp(48px, 5vw, 64px)' : '32px'

  return (
    <motion.div
      style={{
        fontFamily: 'var(--font-display), Georgia, serif',
        fontSize,
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        color,
      }}
      animate={isCalculating ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
      transition={isCalculating
        ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
        : { duration: 0.2 }
      }
    >
      <motion.span>{display}</motion.span>%
    </motion.div>
  )
}
