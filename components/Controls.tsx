'use client'

import React from 'react'

export type ControlsProps = {
  street: number       // 0=preflop, 1=flop dealt, 2=turn dealt, 3=river dealt
  isDealing: boolean   // true while cards are animating in (button disabled)
  onDeal: () => void
  onReset: () => void
  onRandomize: () => void
}

const DEAL_LABELS = ['Deal Flop', 'Deal Turn', 'Deal River']

export function Controls({ street, isDealing, onDeal, onReset, onRandomize }: ControlsProps) {
  const dealLabel = street >= 3 ? 'River Dealt' : DEAL_LABELS[street] ?? 'Deal'
  const dealDisabled = isDealing || street >= 3

  const primaryBtn: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid var(--gold)',
    color: 'var(--gold)',
    padding: '10px 26px',
    borderRadius: 4,
    cursor: dealDisabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: dealDisabled ? 0.22 : 1,
    transition: 'background 0.2s, opacity 0.2s',
  }

  const secondaryBtn: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'var(--ghost)',
    padding: '10px 26px',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    transition: 'background 0.2s',
  }

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
      <button
        style={primaryBtn}
        onClick={dealDisabled ? undefined : onDeal}
        disabled={dealDisabled}
        onMouseEnter={e => {
          if (!dealDisabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(184,148,58,0.09)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
        onMouseDown={e => {
          if (!dealDisabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'
        }}
        onMouseUp={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
        }}
      >
        {dealLabel}
      </button>
      <button
        style={secondaryBtn}
        onClick={onReset}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        New Hand
      </button>
      <button
        style={secondaryBtn}
        onClick={onRandomize}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        Randomize
      </button>
    </div>
  )
}
