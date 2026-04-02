'use client'

import { motion, AnimatePresence } from 'framer-motion'

export type ResultBannerProps = {
  visible: boolean
  text: string             // e.g. "Hero wins — Full House"
  type: 'hero' | 'villain' | 'split'
}

const TYPE_STYLES = {
  hero: {
    background: 'rgba(184,148,58,0.12)',
    border: '1px solid rgba(184,148,58,0.3)',
    color: 'var(--gold)',
  },
  villain: {
    background: 'rgba(74,133,176,0.12)',
    border: '1px solid rgba(74,133,176,0.3)',
    color: 'var(--steel)',
  },
  split: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--parchment)',
  },
}

export function ResultBanner({ visible, text, type }: ResultBannerProps) {
  const styles = TYPE_STYLES[type]

  return (
    <div style={{ minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              padding: '9px 22px',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 700,
              fontStyle: 'italic',
              textAlign: 'center',
              ...styles,
            }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
