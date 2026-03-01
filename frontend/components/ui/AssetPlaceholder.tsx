interface AssetPlaceholderProps {
  name: string
  width: number
  height: number
}

export function AssetPlaceholder({ name, width, height }: AssetPlaceholderProps) {
  return (
    <div
      className="bg-zen-slate border border-zen-plasma/30 flex items-center justify-center clipped-corners"
      style={{ width, height }}
    >
      <span className="font-heading text-[8px] text-zen-plasma/50 uppercase">[{name}]</span>
    </div>
  )
}
