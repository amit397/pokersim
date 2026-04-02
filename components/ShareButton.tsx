'use client'

import { useState } from 'react'
import { type Card } from '@/lib/deck'
import { encodeHandState } from '@/lib/parseUrl'

export type ShareButtonProps = {
  players: Card[][]
  board: Card[]
  visible: boolean
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
      window.prompt('Copy this URL:', url)
    })
  }

  return (
    <button
      onClick={handleShare}
      style={{
        background: 'transparent',
        border: `1px solid ${copied ? 'var(--teal)' : 'var(--gold)'}`,
        color: copied ? 'var(--teal)' : 'var(--gold)',
        padding: '10px 26px',
        borderRadius: 4,
        cursor: 'pointer',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        transition: 'color 0.2s, border-color 0.2s, background 0.2s',
        marginTop: 8,
      }}
      onMouseEnter={e => {
        if (!copied) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(184,148,58,0.09)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {copied ? 'Copied' : 'Share this hand'}
    </button>
  )
}
