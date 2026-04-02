import { Card, mkDeck, shuf, strip } from './deck'
import { best } from './evaluator'

export type MonteCarloResult = {
  equity: number[]   // one per player, each 0-100, sums to ~100
}

/**
 * Run Monte Carlo simulation for N players.
 * players: array of hole card pairs, e.g. [[heroCard1, heroCard2], [villainCard1, villainCard2]]
 * board: 0-5 community cards already dealt
 * n: number of iterations (default 4000)
 *
 * For each iteration:
 *   1. Strip all known cards from a fresh deck
 *   2. Shuffle the remaining deck
 *   3. Deal (5 - board.length) cards to complete the board
 *   4. Evaluate best() for each player against the complete board
 *   5. Find the winner(s) — highest score wins; ties split equally (1/numWinners each)
 *   6. Tally results
 *
 * Returns equity as percentages (0-100).
 */
export function monteCarlo(
  players: Card[][],
  board: Card[],
  n: number = 4000
): MonteCarloResult {
  const allHoleCards = players.flat()
  const dead = [...allHoleCards, ...board]
  const avail = strip(mkDeck(), dead)
  const need = 5 - board.length

  // wins[i] accumulates win shares for player i
  const wins = new Array<number>(players.length).fill(0)

  for (let i = 0; i < n; i++) {
    const sh = shuf(avail)
    const runout = [...board, ...sh.slice(0, need)]
    const scores = players.map(p => best(p, runout).score)
    const maxScore = Math.max(...scores)
    const winners = scores.reduce<number[]>((acc, s, idx) => {
      if (s === maxScore) acc.push(idx)
      return acc
    }, [])
    const share = 1 / winners.length
    winners.forEach(idx => { wins[idx] += share })
  }

  const equity = wins.map(w => (w / n) * 100)
  return { equity }
}

export type OutsResult = {
  outs: Card[]
  beneficiary: string[]  // parallel array: player ID who benefits from each out card
}

/**
 * Compute which remaining deck cards would change the current leader.
 * Only meaningful when board has 3 or 4 cards (after flop or turn).
 *
 * Algorithm:
 *   1. Evaluate best() for each player with the current board to find current leader
 *   2. Get remaining deck (strip all hole cards + board)
 *   3. For each remaining card, create testBoard = [...board, card]
 *   4. Evaluate best() for each player with testBoard
 *   5. If the leader changes, that card is an "out" — record it and who benefits
 */
export function computeOuts(
  players: Card[][],
  playerIds: string[],
  board: Card[]
): OutsResult {
  // Find current leader index based on current board
  const currentScores = players.map(p => best(p, board).score)
  const currentMax = Math.max(...currentScores)
  const currentLeaderIdx = currentScores.findIndex(s => s === currentMax)

  // Get remaining deck
  const allHoleCards = players.flat()
  const remaining = strip(mkDeck(), [...allHoleCards, ...board])

  const outs: Card[] = []
  const beneficiary: string[] = []

  remaining.forEach(card => {
    const testBoard = [...board, card]
    const testScores = players.map(p => best(p, testBoard).score)
    const testMax = Math.max(...testScores)
    const testLeaderIdx = testScores.findIndex(s => s === testMax)

    if (testLeaderIdx !== currentLeaderIdx) {
      outs.push(card)
      beneficiary.push(playerIds[testLeaderIdx])
    }
  })

  return { outs, beneficiary }
}

