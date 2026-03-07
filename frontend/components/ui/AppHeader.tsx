"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { RoninSprite } from "@/components/ui/RoninSprite"

export const APP_HEADER_HEIGHT = 88

const FORM_NAMES: Record<number, string> = {
  1: "浪人 Ronin",
  2: "Warrior",
  3: "Samurai",
  4: "The Ghost",
}

interface AppHeaderProps {
  /** When passed, shows character portrait + stats on the right. */
  character?: { character_form: number; total_xp: number }
  /**
   * Drives the XP count-up animation. Pass `character.total_xp`; when this
   * prop changes the number animates up (or down) over 1200ms.
   */
  targetXp?: number
  /** When set, shows a chevron back button in the top-left. */
  backHref?: string
  /** Label for the back button (default: "Back"). */
  backLabel?: string
  /** Optional page context label shown in the center slot. */
  pageTitle?: string
}

export function AppHeader({
  character,
  targetXp = 0,
  backHref,
  backLabel = "Back",
  pageTitle,
}: AppHeaderProps) {
  const router = useRouter()
  const [displayXp, setDisplayXp] = useState(targetXp)
  const prevXp = useRef(targetXp)

  useEffect(() => {
    if (targetXp === prevXp.current) return
    const start = prevXp.current
    const end   = targetXp
    const duration  = 1200
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
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 select-none
        bg-zen-void/95 backdrop-blur-md
        border-b border-white/[0.04]
        shadow-[inset_0_-1px_0_rgba(122,162,247,0.06)]
      `}
      style={{ height: APP_HEADER_HEIGHT }}
    >
      <div className="h-full grid grid-cols-[1fr_auto_1fr] items-stretch px-3">

        {/* ── LEFT — back chevron or brand wordmark ─────────────────────── */}
        <div className="flex items-center">
          {backHref ? (
            <motion.button
              onClick={() => router.push(backHref)}
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="
                flex items-center gap-2
                clipped-corners-sm
                px-3 py-[7px]
                bg-zen-slate/30 border border-white/[0.06]
                font-mono text-[10px] uppercase tracking-widest
                text-zen-plasma/50
                hover:text-zen-plasma hover:border-zen-plasma/20 hover:bg-zen-slate/50
                transition-colors
              "
            >
              {/* Chevron — inline SVG, no external icon dep */}
              <svg width="7" height="11" viewBox="0 0 7 11" fill="none" aria-hidden="true">
                <path
                  d="M6 1L1 5.5L6 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {backLabel}
            </motion.button>
          ) : (
            /* Worldmark on home screen — deliberately muted */
            <span className="font-heading text-[10px] tracking-[0.28em] uppercase text-zen-gold/35 pl-1">
              Zenkai
            </span>
          )}
        </div>

        {/* ── CENTER — optional page context label ─────────────────────── */}
        <div className="flex items-center justify-center px-2">
          {pageTitle && (
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zen-plasma/25 max-w-[200px] truncate">
              {pageTitle}
            </p>
          )}
        </div>

        {/* ── RIGHT — character portrait ────────────────────────────────── */}
        {character ? (
          <div className="flex items-stretch justify-end">

            {/* Stats block — vertically centered in the header */}
            <div className="flex flex-col justify-center items-end gap-[3px] pr-3 py-3">
              <p className="font-heading text-zen-gold text-[13px] font-semibold leading-none tracking-tight">
                {FORM_NAMES[character.character_form] ?? "Ronin"}
              </p>
              <p className="font-mono text-[10px] text-zen-plasma/50 tracking-widest leading-none">
                {displayXp} XP
              </p>

              {/* Utility row: currency + review queue */}
              <div className="flex items-center gap-3 mt-[4px]">
                <div
                  data-testid="currency-slot"
                  className="flex items-center gap-1 opacity-30 cursor-not-allowed"
                  title="Marketplace — coming soon"
                >
                  <span className="font-mono text-[10px] text-zen-gold">◈</span>
                  <span className="font-mono text-[9px] text-zen-plasma/40">—</span>
                </div>
                <button
                  onClick={() => router.push("/review")}
                  className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40 hover:text-zen-plasma/80 transition-colors"
                >
                  Review Queue
                </button>
              </div>
            </div>

            {/*
             * Sprite — bottom-aligned so the character stands on the header's
             * bottom border. At scale=0.9 the sprite is ~86px, fitting cleanly
             * within the 88px header with 2px breathing room at the top.
             */}
            <div className="flex items-end">
              <RoninSprite
                animation="breathing-idle"
                direction="south"
                scale={0.9}
              />
            </div>
          </div>
        ) : (
          /* Empty placeholder keeps the 3-col grid balanced */
          <div />
        )}
      </div>
    </header>
  )
}
