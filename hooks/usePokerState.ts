'use client'

import { useReducer, useEffect, useCallback, useRef } from 'react'
import { type Card, mkDeck, shuf, strip, cardKey } from '@/lib/deck'
import { best, HAND_NAMES } from '@/lib/evaluator'
import { SCENARIOS, PLAYER_IDS, PLAYER_LABELS, isPlaceholder, type Scenario } from '@/lib/scenarios'
import { useEquity } from '@/hooks/useEquity'

// ---- Types ----

type Player = {
  id: string
  label: string
  cards: [Card, Card]
  equity: number
}

type GameState = {
  players: Player[]
  board: Card[]
  fullBoard: Card[]
  street: number
  isDealing: boolean
  activeScenarioId: string | null
  equityHistory: number[][]
  outs: Card[]
  outsBeneficiary: string[]
  pickerTarget: { playerId: string; cardIndex: 0 | 1 } | null
  result: {
    text: string
    type: 'hero' | 'villain' | 'split'
  } | null
}

type Action =
  | { type: 'SELECT_SCENARIO'; scenario: Scenario }
  | { type: 'DEAL_START' }
  | { type: 'DEAL_COMPLETE'; newBoard: Card[] }
  | { type: 'RESET' }
  | { type: 'SET_EQUITY'; equity: number[]; outs: Card[]; outsBeneficiary: string[] }
  | { type: 'SET_RESULT'; result: { text: string; type: 'hero' | 'villain' | 'split' } }
  | { type: 'UPDATE_CARD'; playerId: string; cardIndex: 0 | 1; newCard: Card }
  | { type: 'ADD_PLAYER' }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'OPEN_PICKER'; playerId: string; cardIndex: 0 | 1 }
  | { type: 'CLOSE_PICKER' }
  | { type: 'RANDOMIZE_ALL' }

// ---- Helpers ----

function resolveScenarioPlayers(players: Scenario['players']): Player[] {
  const dead: Card[] = []
  // First pass: collect all non-placeholder cards as dead
  for (const p of players) {
    for (const c of p.cards) {
      if (!isPlaceholder(c)) dead.push(c)
    }
  }
  // Second pass: assign placeholders
  return players.map(p => {
    const resolvedCards = p.cards.map(card => {
      if (isPlaceholder(card)) {
        const avail = strip(mkDeck(), dead)
        const picked = shuf(avail)[0]
        dead.push(picked)
        return picked
      }
      return card
    }) as [Card, Card]
    return { id: p.id, label: p.label, cards: resolvedCards, equity: 0 }
  })
}

function buildFullBoard(players: Player[]): Card[] {
  const dead = players.flatMap(p => p.cards)
  return shuf(strip(mkDeck(), dead)).slice(0, 5)
}

// ---- Reducer ----

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SELECT_SCENARIO': {
      const players = resolveScenarioPlayers(action.scenario.players)
      const dead = players.flatMap(p => p.cards)
      const fullBoard = shuf(strip(mkDeck(), dead)).slice(0, 5)
      return {
        ...state,
        players,
        board: [],
        fullBoard,
        street: 0,
        isDealing: false,
        activeScenarioId: action.scenario.id,
        equityHistory: [],
        result: null,
        pickerTarget: null,
        outs: [],
        outsBeneficiary: [],
      }
    }

    case 'DEAL_START': {
      return { ...state, isDealing: true }
    }

    case 'DEAL_COMPLETE': {
      return {
        ...state,
        board: action.newBoard,
        isDealing: false,
        street: state.street + 1,
      }
    }

    case 'RESET': {
      // Re-shuffle the board, keep players' cards, reset board/street/result
      const fullBoard = buildFullBoard(state.players)
      return {
        ...state,
        board: [],
        fullBoard,
        street: 0,
        isDealing: false,
        equityHistory: [],
        result: null,
        pickerTarget: null,
        outs: [],
        outsBeneficiary: [],
      }
    }

    case 'SET_EQUITY': {
      const updatedPlayers = state.players.map((p, i) => ({
        ...p,
        equity: action.equity[i] ?? p.equity,
      }))
      return {
        ...state,
        players: updatedPlayers,
        equityHistory: [...state.equityHistory, action.equity],
        outs: action.outs,
        outsBeneficiary: action.outsBeneficiary,
      }
    }

    case 'SET_RESULT': {
      return { ...state, result: action.result }
    }

    case 'UPDATE_CARD': {
      const { playerId, cardIndex, newCard } = action
      // Validate: new card not already in use (excluding the card being replaced)
      const otherDeadCards = [
        ...state.players.flatMap(p =>
          p.id === playerId
            ? p.cards.filter((_, i) => i !== cardIndex)
            : p.cards
        ),
        ...state.board,
      ]
      if (otherDeadCards.some(c => cardKey(c) === cardKey(newCard))) return state

      const newPlayers = state.players.map(p => {
        if (p.id !== playerId) return p
        const newCards = [...p.cards] as [Card, Card]
        newCards[cardIndex] = newCard
        return { ...p, cards: newCards }
      })
      const dead = newPlayers.flatMap(p => p.cards)
      const fullBoard = shuf(strip(mkDeck(), dead)).slice(0, 5)
      return {
        ...state,
        players: newPlayers,
        board: [],
        fullBoard,
        street: 0,
        result: null,
        equityHistory: [],
        outs: [],
        outsBeneficiary: [],
        pickerTarget: null,
      }
    }

    case 'ADD_PLAYER': {
      if (state.players.length >= 6) return state
      const usedIds = new Set(state.players.map(p => p.id))
      const nextId = PLAYER_IDS.find(id => !usedIds.has(id))
      if (!nextId) return state
      const dead = state.players.flatMap(p => p.cards)
      const avail = shuf(strip(mkDeck(), dead))
      const newCards: [Card, Card] = [avail[0], avail[1]]
      const newPlayer: Player = {
        id: nextId,
        label: PLAYER_LABELS[nextId],
        cards: newCards,
        equity: 0,
      }
      const newPlayers = [...state.players, newPlayer]
      const allDead = newPlayers.flatMap(p => p.cards)
      const fullBoard = shuf(strip(mkDeck(), allDead)).slice(0, 5)
      return {
        ...state,
        players: newPlayers,
        board: [],
        fullBoard,
        street: 0,
        result: null,
        equityHistory: [],
        outs: [],
        outsBeneficiary: [],
      }
    }

    case 'REMOVE_PLAYER': {
      if (action.playerId === 'hero') return state
      const newPlayers = state.players.filter(p => p.id !== action.playerId)
      if (newPlayers.length < 2) return state
      const dead = newPlayers.flatMap(p => p.cards)
      const fullBoard = shuf(strip(mkDeck(), dead)).slice(0, 5)
      return {
        ...state,
        players: newPlayers,
        board: [],
        fullBoard,
        street: 0,
        result: null,
        equityHistory: [],
        outs: [],
        outsBeneficiary: [],
      }
    }

    case 'OPEN_PICKER': {
      return {
        ...state,
        pickerTarget: { playerId: action.playerId, cardIndex: action.cardIndex },
      }
    }

    case 'CLOSE_PICKER': {
      return { ...state, pickerTarget: null }
    }

    case 'RANDOMIZE_ALL': {
      // Deal fresh random cards to every player from a shrinking deck
      const shuffled = shuf(mkDeck())
      let remaining = shuffled
      const newPlayers = state.players.map(p => {
        const c1 = remaining[0]
        const c2 = remaining[1]
        remaining = remaining.slice(2)
        return { ...p, cards: [c1, c2] as [Card, Card] }
      })
      const allDead = newPlayers.flatMap(p => p.cards)
      const fullBoard = shuf(strip(mkDeck(), allDead)).slice(0, 5)
      return {
        ...state,
        players: newPlayers,
        board: [],
        fullBoard,
        street: 0,
        isDealing: false,
        result: null,
        equityHistory: [],
        outs: [],
        outsBeneficiary: [],
        pickerTarget: null,
      }
    }

    default: {
      const _exhaustive: never = action
      return _exhaustive
    }
  }
}

// ---- Initial State ----

function buildInitialState(): GameState {
  const scenario = SCENARIOS[0]
  const players = resolveScenarioPlayers(scenario.players)
  const dead = players.flatMap(p => p.cards)
  const fullBoard = shuf(strip(mkDeck(), dead)).slice(0, 5)
  return {
    players,
    board: [],
    fullBoard,
    street: 0,
    isDealing: false,
    activeScenarioId: scenario.id,
    equityHistory: [],
    outs: [],
    outsBeneficiary: [],
    pickerTarget: null,
    result: null,
  }
}

// ---- Hook ----

export function usePokerState() {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState)
  const { result: equityResult, isCalculating, calculate } = useEquity()

  // When equity result arrives from worker, dispatch SET_EQUITY
  useEffect(() => {
    if (!equityResult) return
    dispatch({
      type: 'SET_EQUITY',
      equity: equityResult.equity,
      outs: equityResult.outs,
      outsBeneficiary: equityResult.outsBeneficiary,
    })
  }, [equityResult])

  // Trigger equity calculation
  const triggerCalc = useCallback(() => {
    const playerIds = state.players.map(p => p.id)
    const playerCards = state.players.map(p => p.cards)
    calculate(playerCards, playerIds, state.board)
  }, [state.players, state.board, calculate])

  // Deal function — advances street, animates cards
  const deal = useCallback(() => {
    if (state.street >= 3 || state.isDealing) return
    dispatch({ type: 'DEAL_START' })

    const newBoard = (() => {
      if (state.street === 0) return state.fullBoard.slice(0, 3)
      if (state.street === 1) return state.fullBoard.slice(0, 4)
      return state.fullBoard.slice(0, 5)
    })()

    // Wait for card animations, then complete deal + run equity
    const animDelay = state.street === 0 ? 650 : 450 // flop takes longer (3 cards + stagger)
    setTimeout(() => {
      dispatch({ type: 'DEAL_COMPLETE', newBoard })
      const nextStreet = state.street + 1
      if (nextStreet < 3) {
        // Run equity after flop/turn
        const playerIds = state.players.map(p => p.id)
        calculate(state.players.map(p => p.cards), playerIds, newBoard)
      } else {
        // River: evaluate winner, don't need Monte Carlo
        const results = state.players.map(p => best(p.cards, newBoard))
        const maxScore = Math.max(...results.map(r => r.score))
        const tiedIndices = results.reduce<number[]>((acc, r, i) => {
          if (r.score === maxScore) acc.push(i)
          return acc
        }, [])
        const winnerIdx = results.findIndex(r => r.score === maxScore)

        let resultText: string
        let resultType: 'hero' | 'villain' | 'split'

        if (tiedIndices.length > 1) {
          resultText = `Split pot — ${HAND_NAMES[results[0].hr]}`
          resultType = 'split'
          const eq = state.players.map((_, i) =>
            tiedIndices.includes(i) ? 100 / tiedIndices.length : 0
          )
          dispatch({ type: 'SET_EQUITY', equity: eq, outs: [], outsBeneficiary: [] })
        } else {
          const winner = state.players[winnerIdx]
          const handName = HAND_NAMES[results[winnerIdx].hr]
          resultText = `${winner.label} wins — ${handName}`
          resultType = winner.id === 'hero' ? 'hero' : 'villain'
          const eq = state.players.map((_, i) => (i === winnerIdx ? 100 : 0))
          dispatch({ type: 'SET_EQUITY', equity: eq, outs: [], outsBeneficiary: [] })
        }

        setTimeout(() => {
          dispatch({ type: 'SET_RESULT', result: { text: resultText, type: resultType } })
        }, 450)
      }
    }, animDelay)
  }, [state, calculate])

  // Select scenario
  const selectScenario = useCallback((scenario: Scenario) => {
    dispatch({ type: 'SELECT_SCENARIO', scenario })
  }, [])

  // Reset — re-select current scenario
  const reset = useCallback(() => {
    const sc = SCENARIOS.find(s => s.id === state.activeScenarioId)
    if (sc) dispatch({ type: 'SELECT_SCENARIO', scenario: sc })
    else dispatch({ type: 'SELECT_SCENARIO', scenario: SCENARIOS[0] })
  }, [state.activeScenarioId])

  // Trigger calc whenever scenario/players change (on SELECT_SCENARIO and resets)
  const prevScenarioRef = useRef<string | null>(null)
  const prevPlayerKeysRef = useRef<string>('')
  useEffect(() => {
    const playerKey = state.players
      .map(p => `${p.id}:${p.cards.map(cardKey).join(',')}`)
      .join('|')
    if (
      state.board.length === 0 &&
      state.street === 0 &&
      (state.activeScenarioId !== prevScenarioRef.current ||
        playerKey !== prevPlayerKeysRef.current)
    ) {
      prevScenarioRef.current = state.activeScenarioId
      prevPlayerKeysRef.current = playerKey
      triggerCalc()
    }
  }, [state.players, state.board, state.street, state.activeScenarioId, triggerCalc])

  // Derived
  const allDeadCards = [
    ...state.players.flatMap(p => p.cards),
    ...state.board,
  ]

  return {
    players: state.players,
    board: state.board,
    street: state.street,
    isDealing: state.isDealing,
    isCalculating,
    activeScenarioId: state.activeScenarioId,
    result: state.result,
    equityHistory: state.equityHistory,
    outs: state.outs,
    outsBeneficiary: state.outsBeneficiary,
    pickerTarget: state.pickerTarget,
    turnEquity: state.equityHistory[2] ?? null,
    allDeadCards,
    canAddPlayer: state.players.length < 6,
    selectScenario,
    deal,
    reset,
    updateCard: (playerId: string, cardIndex: 0 | 1, newCard: Card) =>
      dispatch({ type: 'UPDATE_CARD', playerId, cardIndex, newCard }),
    addPlayer: () => dispatch({ type: 'ADD_PLAYER' }),
    removePlayer: (playerId: string) => dispatch({ type: 'REMOVE_PLAYER', playerId }),
    openPicker: (playerId: string, cardIndex: 0 | 1) =>
      dispatch({ type: 'OPEN_PICKER', playerId, cardIndex }),
    closePicker: () => dispatch({ type: 'CLOSE_PICKER' }),
    randomizeAll: () => dispatch({ type: 'RANDOMIZE_ALL' }),
  }
}
