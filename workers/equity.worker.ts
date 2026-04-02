/// <reference lib="webworker" />

import { tupleToCard, cardToTuple, type Card } from '../lib/deck'
import { monteCarlo, computeOuts } from '../lib/monteCarlo'

export type WorkerRequest = {
  id: number
  players: [number, string][][]  // each player: array of [rank, suit] tuples
  board: [number, string][]      // board card tuples
  playerIds: string[]            // parallel array of player IDs e.g. ["hero","p2"]
  iterations?: number            // default 4000
}

export type WorkerResponse = {
  id: number
  equity: number[]
  outs: [number, string][]       // out cards as tuples
  outsBeneficiary: string[]      // parallel: player ID who benefits from each out
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, players, board, playerIds, iterations = 4000 } = e.data

  // Convert tuples → Card objects
  const playerCards: Card[][] = players.map(p => p.map(tupleToCard))
  const boardCards: Card[] = board.map(tupleToCard)

  // Run Monte Carlo
  const result = monteCarlo(playerCards, boardCards, iterations)

  // Compute outs only for flop (3 cards) or turn (4 cards)
  let outsCards: Card[] = []
  let outsBeneficiary: string[] = []
  if (boardCards.length === 3 || boardCards.length === 4) {
    const outsResult = computeOuts(playerCards, playerIds, boardCards)
    outsCards = outsResult.outs
    outsBeneficiary = outsResult.beneficiary
  }

  const response: WorkerResponse = {
    id,
    equity: result.equity,
    outs: outsCards.map(cardToTuple),
    outsBeneficiary,
  }

  self.postMessage(response)
}
