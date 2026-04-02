'use client'

export type EquityLegendEntry = {
  id: string
  label: string
  equity: number
  color: string    // CSS variable string e.g. 'var(--gold)'
}

export type EquityLegendProps = {
  players: EquityLegendEntry[]
}

export function EquityLegend({ players }: EquityLegendProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 16,
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginTop: 8,
    }}>
      {players.map(p => (
        <div
          key={p.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            color: 'var(--parchment)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {/* Colored dot */}
          <span style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: p.color,
            flexShrink: 0,
          }} />
          <span>{p.label}</span>
          <span style={{ color: p.color }}>{Math.round(p.equity)}%</span>
        </div>
      ))}
    </div>
  )
}
