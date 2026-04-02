export type CardSlotProps = {
  size?: 'sm' | 'md'
}

export function CardSlot({ size = 'md' }: CardSlotProps) {
  const dim = size === 'md'
    ? { width: 70, height: 98, borderRadius: 8 }
    : { width: 52, height: 73, borderRadius: 6 }

  return (
    <div
      style={{
        width: dim.width,
        height: dim.height,
        borderRadius: dim.borderRadius,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        flexShrink: 0,
      }}
    />
  )
}
