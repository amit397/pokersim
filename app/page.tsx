'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { SCENARIOS, PLAYER_COLORS, PLAYER_LABELS } from '@/lib/scenarios'
import { usePokerState, type Player } from '@/hooks/usePokerState'
import { EquityBar } from '@/components/EquityBar'
import { EquityLegend } from '@/components/EquityLegend'
import { EquityNumber } from '@/components/EquityNumber'
import { EquitySparkline } from '@/components/EquitySparkline'
import { ScenarioPills } from '@/components/ScenarioPills'
import { Board } from '@/components/Board'
import { PlayersGrid } from '@/components/PlayersGrid'
import { OutsTray } from '@/components/OutsTray'
import { Controls } from '@/components/Controls'
import { ResultBanner } from '@/components/ResultBanner'
import { AddPlayerButton } from '@/components/AddPlayerButton'
import { CardPicker } from '@/components/CardPicker'
import { ShareButton } from '@/components/ShareButton'
import { decodeHandState } from '@/lib/parseUrl'
import { mkDeck, shuf, strip, type Card } from '@/lib/deck'

// Screen shake variants
const shakeVariants: Variants = {
  idle: { x: 0 },
  badBeat: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.5, ease: 'easeInOut' as const },
  },
  twoOuter: {
    x: [0, -14, 14, -10, 10, -6, 6, -3, 3, 0],
    transition: { duration: 0.7, ease: 'easeInOut' as const },
  },
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const state = usePokerState()
  const {
    players, board, street, isDealing, isCalculating,
    activeScenarioId, result, equityHistory, outs, outsBeneficiary,
    pickerTarget, turnEquity, allDeadCards, canAddPlayer,
    selectScenario, deal, dealRef, reset, updateCard, addPlayer,
    removePlayer, openPicker, closePicker, randomizeAll, loadSharedHand,
  } = state

  // URL auto-replay: load shared hand on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const decoded = decodeHandState(new URLSearchParams(window.location.search))
    if (!decoded) return

    const playerIds = ['hero', 'p2', 'p3', 'p4', 'p5', 'p6']
    const isHeadsUp = decoded.players.length === 2

    // Build Player objects from decoded URL data
    const players: Player[] = decoded.players.map((cards, i) => ({
      id: playerIds[i],
      label: i === 0 ? 'Hero' : (isHeadsUp ? 'Villain' : (PLAYER_LABELS[playerIds[i]] ?? `Player ${i + 1}`)),
      cards: cards as [Card, Card],
      equity: 0,
    }))

    // Reconstruct fullBoard: decoded board cards first, then random remainder
    const dead = [...decoded.players.flat(), ...decoded.board]
    const remaining = shuf(strip(mkDeck(), dead)).slice(0, 5 - decoded.board.length)
    const fullBoard = [...decoded.board, ...remaining]

    // Load in one atomic dispatch — no stale closure risk
    loadSharedHand(players, fullBoard)

    // Chain deals using dealRef so each call uses the latest deal function
    const boardLen = decoded.board.length
    if (boardLen >= 3) {
      setTimeout(() => dealRef.current(), 100)
      if (boardLen >= 4) setTimeout(() => dealRef.current(), 1300)
      if (boardLen === 5) setTimeout(() => dealRef.current(), 2500)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [shakeState, setShakeState] = useState<'idle' | 'badBeat' | 'twoOuter'>('idle')
  const [feltFlash, setFeltFlash] = useState(false)

  // Bad beat detection — runs after river result is set
  useEffect(() => {
    if (!result || street !== 3 || !turnEquity) return
    const turnLeaderIdx = turnEquity.indexOf(Math.max(...turnEquity))
    const riverLeaderIdx = players.map(p => p.equity).indexOf(100)
    if (riverLeaderIdx === -1 || turnLeaderIdx === riverLeaderIdx) return

    const leaderEquityAtTurn = turnEquity[turnLeaderIdx]
    if (leaderEquityAtTurn >= 95) {
      setShakeState('twoOuter')
      setFeltFlash(true)
    } else if (leaderEquityAtTurn >= 80) {
      setShakeState('badBeat')
    }
  }, [result])

  // Street info text
  const streetInfoText = (() => {
    if (isCalculating && street === 0) return 'Preflop · 4,000 simulations running...'
    if (street === 0) {
      const eq = players.map(p => `${p.label} ${Math.round(p.equity)}%`).join(' / ')
      return `Preflop equity · ${eq}`
    }
    if (street === 1) {
      const hero = Math.round(players[0].equity)
      const others = players.slice(1).map(p => Math.round(p.equity)).join('% · ')
      return `After flop · ${hero}% vs ${others}%`
    }
    if (street === 2) {
      const hero = Math.round(players[0].equity)
      const others = players.slice(1).map(p => Math.round(p.equity)).join('% · ')
      return `After turn · ${hero}% vs ${others}%`
    }
    return 'River · All 5 community cards dealt'
  })()

  // Equity bar props
  const isMultiplayer = players.length > 2
  const equityBarPlayers = players.map(p => ({
    id: p.id,
    equity: p.equity,
    color: PLAYER_COLORS[p.id]?.main ?? 'var(--gold)',
    label: p.label,
  }))
  const prevEquity = equityHistory.length > 0 ? equityHistory[equityHistory.length - 1] : undefined

  // Sparkline players (id, label, color)
  const sparklinePlayers = players.map(p => ({
    id: p.id,
    label: p.label,
    color: PLAYER_COLORS[p.id]?.main ?? 'var(--gold)',
  }))

  // Card picker current card
  const pickerCurrentCard = pickerTarget
    ? players.find(p => p.id === pickerTarget.playerId)?.cards[pickerTarget.cardIndex] ?? null
    : null
  const pickerPlayerColor = pickerTarget
    ? PLAYER_COLORS[pickerTarget.playerId]?.main ?? 'var(--gold)'
    : 'var(--gold)'
  const pickerDeadCards = pickerTarget
    ? allDeadCards.filter(c => {
        const targetCard = players.find(p => p.id === pickerTarget.playerId)?.cards[pickerTarget.cardIndex]
        return !(targetCard && c.r === targetCard.r && c.s === targetCard.s)
      })
    : allDeadCards

  // Suppress SSR render to avoid hydration mismatch from random card generation
  if (!mounted) return null

  return (
    <>
      {/* Felt flash overlay for 2-outer */}
      <AnimatePresence>
        {feltFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            onAnimationComplete={() => setFeltFlash(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(180,40,40,0.08)',
              pointerEvents: 'none', zIndex: 9998,
            }}
          />
        )}
      </AnimatePresence>

      {/* Card Picker Modal */}
      <CardPicker
        isOpen={pickerTarget !== null}
        onSelect={(card) => {
          if (pickerTarget) {
            updateCard(pickerTarget.playerId, pickerTarget.cardIndex, card)
            closePicker()
          }
        }}
        onClose={closePicker}
        deadCards={pickerDeadCards}
        currentCard={pickerCurrentCard}
        playerColor={pickerPlayerColor}
        outsCards={street >= 1 && street <= 2 ? outs : []}
        outsBeneficiary={street >= 1 && street <= 2 ? outsBeneficiary : []}
        playerColors={PLAYER_COLORS}
      />

      {/* Main content with shake wrapper */}
      <motion.div
        variants={shakeVariants}
        animate={shakeState}
        onAnimationComplete={() => setShakeState('idle')}
        style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}
      >
        {/* Header */}
        <p className="font-mono" style={{
          textAlign: 'center', fontSize: 10, letterSpacing: 4,
          textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4,
        }}>
          Poker Equity Visualizer
        </p>
        <h1 style={{
          textAlign: 'center', fontSize: 'clamp(20px, 4vw, 26px)',
          fontWeight: 700, fontStyle: 'italic', color: 'var(--ivory-dim)',
          marginBottom: 20,
        }}>
          Every Card Changes Everything.
        </h1>

        {/* Scenario Pills */}
        <ScenarioPills
          scenarios={SCENARIOS}
          activeId={activeScenarioId}
          onSelect={selectScenario}
        />

        {/* Equity Display */}
        {!isMultiplayer ? (
          // Heads-up: number — bar — number
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <p className="font-mono" style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--ghost)' }}>
                  {players[0]?.label ?? 'Hero'}
                </p>
                <EquityNumber value={players[0]?.equity ?? 0} color={PLAYER_COLORS.hero.main} size="lg" isCalculating={isCalculating} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="font-mono" style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--ghost)' }}>
                  {players[1]?.label ?? 'Villain'}
                </p>
                <EquityNumber value={players[1]?.equity ?? 0} color={PLAYER_COLORS.p2.main} size="lg" isCalculating={isCalculating} />
              </div>
            </div>
            <EquityBar players={equityBarPlayers} previousEquity={prevEquity} />
          </div>
        ) : (
          // Multi-player: segmented bar + legend
          <div style={{ marginBottom: 8 }}>
            <EquityBar players={equityBarPlayers} previousEquity={prevEquity} />
            {players.length >= 4 && (
              <EquityLegend players={equityBarPlayers} />
            )}
            {players.length === 3 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                {players.map(p => (
                  <div key={p.id} style={{ textAlign: 'center' }}>
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--ghost)', letterSpacing: 2, textTransform: 'uppercase' }}>{p.label}</p>
                    <EquityNumber value={p.equity} color={PLAYER_COLORS[p.id]?.main ?? 'var(--gold)'} size="md" isCalculating={isCalculating} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Street info */}
        <p className="font-mono" style={{
          textAlign: 'center', fontSize: 10, letterSpacing: 2,
          textTransform: 'uppercase', color: 'var(--ghost)',
          marginBottom: 8, marginTop: 8, minHeight: 14,
        }}>
          {streetInfoText}
        </p>

        {/* Board */}
        <Board board={board} />

        {/* Result Banner — visible directly under board after river */}
        {street === 3 && (
          <ResultBanner
            visible={result !== null}
            text={result?.text ?? ''}
            type={result?.type ?? 'hero'}
          />
        )}

        {/* Outs Tray */}
        <OutsTray
          outs={outs}
          outsBeneficiary={outsBeneficiary}
          playerColors={PLAYER_COLORS}
          visible={street === 1 || street === 2}
        />

        {/* Equity Sparkline — only after all 5 cards dealt, between board and players */}
        <EquitySparkline
          equityHistory={equityHistory}
          players={sparklinePlayers}
        />

        {/* Players */}
        <PlayersGrid
          players={players.map(p => ({
            id: p.id,
            label: p.label,
            cards: p.cards,
            equity: p.equity,
            color: PLAYER_COLORS[p.id]?.main ?? 'var(--gold)',
          }))}
          isCalculating={isCalculating}
          onCardClick={(playerId, cardIndex) => openPicker(playerId, cardIndex)}
          onRemovePlayer={removePlayer}
          onCardsChange={(playerId, newCards) => {
            updateCard(playerId, 0, newCards[0])
            updateCard(playerId, 1, newCards[1])
          }}
          allDeadCards={allDeadCards}
        />

        {/* Add Player */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <AddPlayerButton visible={canAddPlayer} onClick={addPlayer} />
        </div>

        {/* Share Button — visible only after river result */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ShareButton
            visible={street === 3 && result !== null}
            players={players.map(p => p.cards)}
            board={board}
          />
        </div>

        {/* Controls */}
        <Controls
          street={street}
          isDealing={isDealing}
          onDeal={deal}
          onReset={reset}
          onRandomize={randomizeAll}
        />
      </motion.div>
    </>
  )
}
