interface AssetPlaceholderProps {
  name?: string
  label?: string
  width?: number
  height?: number
  className?: string
}

export function AssetPlaceholder({ name, label, width, height, className }: AssetPlaceholderProps) {
  const displayName = label ?? name ?? "asset"
  return (
    <div
      className={`bg-zen-slate border border-zen-plasma/30 flex items-center justify-center clipped-corners ${className ?? ""}`}
      style={width || height ? { width, height } : undefined}
    >
      <span className="font-heading text-[8px] text-zen-plasma/50 uppercase">[{displayName}]</span>
    </div>
  )
}
