"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { RoninSprite } from "@/components/ui/RoninSprite"

const FORM_NAMES: Record<number, string> = {
  1: "浪人 Ronin",
  2: "Warrior",
  3: "Samurai",
  4: "The Ghost",
}

interface MapHeaderProps {
  character: { character_form: number; total_xp: number }
  targetXp: number
}

export function MapHeader({ character, targetXp }: MapHeaderProps) {
  const router = useRouter()
  const [displayXp, setDisplayXp] = useState(targetXp)
  const prevXp = useRef(targetXp)

  // Count-up animation when XP increases (e.g. returning from a concept)
  useEffect(() => {
    if (targetXp === prevXp.current) return
    const start = prevXp.current
    const end = targetXp
    const duration = 1200
    const startTime = performance.now()

    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      setDisplayXp(Math.round(start + (end - start) * progress))
      if (progress < 1) requestAnimationFrame(tick)
      else prevXp.current = end
    }

    requestAnimationFrame(tick)
  }, [targetXp])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-zen-void border-b border-zen-plasma/10 select-none">
      {/* Left: sprite + form + XP */}
      <div className="flex items-center gap-3">
        <RoninSprite animation="breathing-idle" direction="south" scale={1} />
        <div>
          <p className="font-heading text-zen-gold text-sm font-semibold leading-tight">
            {FORM_NAMES[character.character_form] ?? "Ronin"}
          </p>
          <p className="font-mono text-[10px] text-zen-plasma/60 tracking-widest">
            {displayXp} XP
          </p>
        </div>
      </div>

      {/* Right: currency placeholder + review queue */}
      <div className="flex items-center gap-5">
        <div
          data-testid="currency-slot"
          className="flex items-center gap-1.5 opacity-30 cursor-not-allowed"
          title="Marketplace — coming soon"
        >
          <span className="font-mono text-sm text-zen-gold">◈</span>
          <span className="font-mono text-xs text-zen-plasma/50">—</span>
        </div>
        <button
          onClick={() => router.push("/review")}
          className="font-mono text-[10px] uppercase tracking-widest text-zen-plasma/60 hover:text-zen-plasma transition-colors"
        >
          Review Queue
        </button>
      </div>
    </header>
  )
}
