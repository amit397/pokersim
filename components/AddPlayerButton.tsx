'use client'

export type AddPlayerButtonProps = {
  visible: boolean
  onClick: () => void
}

export function AddPlayerButton({ visible, onClick }: AddPlayerButtonProps) {
  if (!visible) return null

  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'var(--ghost)',
        padding: '8px 20px',
        borderRadius: 4,
        cursor: 'pointer',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        transition: 'background 0.2s',
        marginTop: 12,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      + Add Player
    </button>
  )
}
