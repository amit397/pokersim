'use client'

import { type Scenario } from '@/lib/scenarios'

export type ScenarioPillsProps = {
  scenarios: Scenario[]
  activeId: string | null
  onSelect: (scenario: Scenario) => void
}

export function ScenarioPills({ scenarios, activeId, onSelect }: ScenarioPillsProps) {
  const headsUp = scenarios.filter(s => s.players.length === 2)
  const multiway = scenarios.filter(s => s.players.length > 2)

  const pillBase: React.CSSProperties = {
    background: 'var(--felt-mid)',
    border: '1px solid rgba(184,148,58,0.18)',
    color: 'var(--ghost)',
    padding: '5px 14px',
    borderRadius: 20,
    cursor: 'pointer',
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 11,
    letterSpacing: 1,
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    outline: 'none',
  }

  const pillActive: React.CSSProperties = {
    ...pillBase,
    borderColor: 'var(--gold)',
    color: 'var(--gold)',
    background: 'rgba(184,148,58,0.08)',
  }

  function PillGroup({ items }: { items: Scenario[] }) {
    return (
      <>
        {items.map(sc => (
          <button
            key={sc.id}
            style={sc.id === activeId ? pillActive : pillBase}
            onClick={() => onSelect(sc)}
            onMouseEnter={e => {
              if (sc.id !== activeId) {
                Object.assign((e.currentTarget as HTMLButtonElement).style, {
                  borderColor: 'var(--gold)',
                  color: 'var(--gold)',
                  background: 'rgba(184,148,58,0.08)',
                })
              }
            }}
            onMouseLeave={e => {
              if (sc.id !== activeId) {
                Object.assign((e.currentTarget as HTMLButtonElement).style, {
                  borderColor: 'rgba(184,148,58,0.18)',
                  color: 'var(--ghost)',
                  background: 'var(--felt-mid)',
                })
              }
            }}
          >
            {sc.name}
          </button>
        ))}
      </>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 26 }}>
      <PillGroup items={headsUp} />
      {multiway.length > 0 && (
        <>
          <span style={{
            color: 'var(--ghost)',
            opacity: 0.3,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            alignSelf: 'center',
            padding: '0 4px',
          }}>|</span>
          <PillGroup items={multiway} />
        </>
      )}
    </div>
  )
}
