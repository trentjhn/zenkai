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
   * prop changes the number animates up over 1200ms.
   */
  targetXp?: number
  /** When set, shows a chevron back button in the top-left. */
  backHref?: string
  /** Label for the back button (default: "Back"). */
  backLabel?: string
}

export function AppHeader({
  character,
  targetXp = 0,
  backHref,
  backLabel = "Back",
}: AppHeaderProps) {
  const router = useRouter()
  const [displayXp, setDisplayXp] = useState(targetXp)
  const prevXp = useRef(targetXp)

  /**
   * Smart back navigation:
   * - If browser has history (user navigated here from another page), go back
   *   one step in real history — works for any depth of navigation.
   * - If history is empty (user landed directly on this URL via bookmark or
   *   direct link), fall back to the canonical parent defined by backHref.
   */
  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else if (backHref) {
      router.push(backHref)
    }
  }

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
    /*
     * Layout strategy: all three zones are absolute-positioned so the
     * "ZENKAI" wordmark is always mathematically centered regardless of
     * how wide the back button or character panel are. This is the same
     * pattern iOS navigation bars use — works identically on 375px iPhones
     * and 1440px desktops without any breakpoint logic.
     */
    <header
      className="fixed top-0 left-0 right-0 z-50 select-none bg-zen-void/95 backdrop-blur-md border-b border-white/[0.04] shadow-[inset_0_-1px_0_rgba(122,162,247,0.06)]"
      style={{ height: APP_HEADER_HEIGHT }}
    >
      {/* ── CENTER — ZENKAI wordmark, always truly centered ─────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="font-heading text-[11px] tracking-[0.32em] uppercase text-zen-gold/50 font-light">
          Zenkai
        </span>
      </div>

      {/* ── LEFT — back button ───────────────────────────────────────────── */}
      <div className="absolute left-0 top-0 h-full flex items-center pl-3">
        {backHref && (
          <motion.button
            onClick={handleBack}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            /*
             * min-h-[44px] min-w-[44px]: Apple HIG minimum touch target size.
             * Even though the visual element is smaller, the tap area is safe
             * for iOS Safari and Android Chrome.
             */
            className="
              flex items-center gap-2
              clipped-corners-sm
              px-3 min-h-[44px] min-w-[44px]
              bg-zen-slate/30 border border-white/[0.06]
              font-mono text-[10px] uppercase tracking-widest
              text-zen-plasma/55
              hover:text-zen-plasma hover:border-zen-plasma/20 hover:bg-zen-slate/50
              active:scale-95
              transition-colors
            "
          >
            {/* Inline chevron — no external icon dependency */}
            <svg width="7" height="11" viewBox="0 0 7 11" fill="none" aria-hidden="true">
              <path
                d="M6 1L1 5.5L6 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="hidden sm:inline">{backLabel}</span>
          </motion.button>
        )}
      </div>

      {/* ── RIGHT — character portrait ────────────────────────────────────── */}
      <div className="absolute right-0 top-0 h-full flex items-stretch">
        {character && (
          <>
            {/* Stats: form name, XP, currency, review queue — hidden on very small screens */}
            <div className="hidden xs:flex flex-col justify-center items-end gap-[3px] pr-3 py-3">
              <p className="font-heading text-zen-gold text-[13px] font-semibold leading-none tracking-tight whitespace-nowrap">
                {FORM_NAMES[character.character_form] ?? "Ronin"}
              </p>
              <p className="font-mono text-[10px] text-zen-plasma/50 tracking-widest leading-none">
                {displayXp} XP
              </p>

              {/* Utility row */}
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
             * Sprite — bottom-aligned so the character appears to stand on
             * the header's bottom border. scale=0.9 → 86px fits within the
             * 88px header with 2px breathing room at the top.
             */}
            <div className="flex items-end">
              <RoninSprite
                animation="breathing-idle"
                direction="south"
                scale={0.9}
              />
            </div>
          </>
        )}
      </div>
    </header>
  )
}
