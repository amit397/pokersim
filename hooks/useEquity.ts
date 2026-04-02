'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { type Card, cardToTuple, tupleToCard } from '@/lib/deck'
import type { WorkerRequest, WorkerResponse } from '@/workers/equity.worker'

export type EquityResult = {
  equity: number[]
  outs: Card[]
  outsBeneficiary: string[]
}

export function useEquity(): {
  result: EquityResult | null
  isCalculating: boolean
  calculate: (players: Card[][], playerIds: string[], board: Card[]) => void
} {
  const [result, setResult] = useState<EquityResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const workerRef = useRef<Worker | null>(null)
  const latestIdRef = useRef<number>(0)

  useEffect(() => {
    const worker = new Worker(new URL('../workers/equity.worker.ts', import.meta.url))
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const response = e.data
      if (response.id !== latestIdRef.current) {
        // Stale response — discard
        return
      }
      const outs: Card[] = response.outs.map(tupleToCard)
      setResult({
        equity: response.equity,
        outs,
        outsBeneficiary: response.outsBeneficiary,
      })
      setIsCalculating(false)
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const calculate = useCallback(
    (players: Card[][], playerIds: string[], board: Card[]) => {
      if (!workerRef.current) return

      latestIdRef.current += 1
      const id = latestIdRef.current

      setIsCalculating(true)

      const request: WorkerRequest = {
        id,
        players: players.map(hand => hand.map(cardToTuple)),
        board: board.map(cardToTuple),
        playerIds,
        iterations: 4000,
      }

      workerRef.current.postMessage(request)
    },
    [],
  )

  return { result, isCalculating, calculate }
}
