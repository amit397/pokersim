'use client'

import { type Card as CardType } from '@/lib/deck'
import { PlayerPanel } from './PlayerPanel'

export type PlayerGridEntry = {
  id: string
  label: string
  cards: [CardType, CardType]
  equity: number
  color: string
}

export type PlayersGridProps = {
  players: PlayerGridEntry[]
  isCalculating: boolean
  onCardClick: (playerId: string, cardIndex: 0 | 1) => void
  onRemovePlayer: (playerId: string) => void
  onCardsChange: (playerId: string, newCards: [CardType, CardType]) => void
  allDeadCards: CardType[]
}

export function PlayersGrid({ players, isCalculating, onCardClick, onRemovePlayer, onCardsChange, allDeadCards }: PlayersGridProps) {
  // Compute dead cards excluding a given player's own cards
  function deadCardsFor(playerId: string) {
    const player = players.find(p => p.id === playerId)
    if (!player) return allDeadCards
    return allDeadCards.filter(c => !player.cards.some(pc => pc.r === c.r && pc.s === c.s))
  }

  if (players.length === 2) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <PlayerPanel
          id={players[0].id}
          label={players[0].label}
          cards={players[0].cards}
          equity={players[0].equity}
          color={players[0].color}
          isCalculating={isCalculating}
          isHero={players[0].id === 'hero'}
          size="md"
          onCardClick={(cardIndex) => onCardClick(players[0].id, cardIndex)}
          onRemove={players[0].id !== 'hero' ? () => onRemovePlayer(players[0].id) : undefined}
          deadCards={deadCardsFor(players[0].id)}
          onCardsChange={(newCards) => onCardsChange(players[0].id, newCards)}
        />
        <div style={{ fontSize: 18, fontWeight: 700, fontStyle: 'italic', color: 'var(--ghost)', opacity: 0.4, flexShrink: 0 }}>
          vs
        </div>
        <PlayerPanel
          id={players[1].id}
          label={players[1].label}
          cards={players[1].cards}
          equity={players[1].equity}
          color={players[1].color}
          isCalculating={isCalculating}
          isHero={players[1].id === 'hero'}
          size="md"
          onCardClick={(cardIndex) => onCardClick(players[1].id, cardIndex)}
          onRemove={players[1].id !== 'hero' ? () => onRemovePlayer(players[1].id) : undefined}
          deadCards={deadCardsFor(players[1].id)}
          onCardsChange={(newCards) => onCardsChange(players[1].id, newCards)}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:flex md:flex-row md:flex-wrap md:justify-center gap-4 mb-5">
      {players.map((p) => (
        <PlayerPanel
          key={p.id}
          id={p.id}
          label={p.label}
          cards={p.cards}
          equity={p.equity}
          color={p.color}
          isCalculating={isCalculating}
          isHero={p.id === 'hero'}
          size="md"
          onCardClick={(cardIndex) => onCardClick(p.id, cardIndex)}
          onRemove={p.id !== 'hero' ? () => onRemovePlayer(p.id) : undefined}
          deadCards={deadCardsFor(p.id)}
          onCardsChange={(newCards) => onCardsChange(p.id, newCards)}
        />
      ))}
    </div>
  )
}
