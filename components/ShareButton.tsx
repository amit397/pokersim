'use client'

import { useState } from 'react'
import { type Card } from '@/lib/deck'
import { encodeHandState } from '@/lib/parseUrl'

export type ShareButtonProps = {
  players: Card[][]     // array of hole card pairs, one per player
  board: Card[]         // all 5 board cards
  visible: boolean      // only show after river
}

export function ShareButton({ players, board, visible }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  if (!visible) return null

  function handleShare() {
    const encoded = encodeHandState(players, board)
    const url = `${window.location.origin}${window.location.pathname}?${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {
      // Fallback: prompt with URL
      window.prompt('Copy this URL:', url)
    })
  }

  return (
    <button
      onClick={handleShare}
      style={{
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.2)',
        color: copied ? 'var(--teal)' : 'var(--ghost)',
        padding: '7px 18px',
        borderRadius: 4,
        cursor: 'pointer',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 10,
        letterSpacing: 2,
        textTransform: 'uppercase',
        transition: 'color 0.2s, border-color 0.2s',
        marginTop: 8,
        borderColor: copied ? 'var(--teal)' : 'rgba(255,255,255,0.2)',
      }}
    >
      {copied ? 'Copied' : 'Share this hand'}
    </button>
  )
}
