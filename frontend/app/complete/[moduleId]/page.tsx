"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryKeys"
import { AppHeader } from "@/components/ui/AppHeader"
import { SamuraiButton } from "@/components/ui/SamuraiButton"
import { RoninSprite } from "@/components/ui/RoninSprite"
import { getLocationByModuleId } from "@/lib/worldMapConfig"

export default function CompletePage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const router = useRouter()
  const moduleIdNum = Number(moduleId)

  const [displayXp, setDisplayXp] = useState(0)

  const { data: character } = useQuery({
    queryKey: queryKeys.character(),
    queryFn: api.getCharacter,
  })

  const { data: module } = useQuery({
    queryKey: queryKeys.module(moduleIdNum),
    queryFn: () => api.getModule(moduleIdNum),
  })

  const { mutate: completeModule, data: completeData } = useMutation({
    mutationFn: () => api.completeModule(moduleIdNum),
  })

  const location = getLocationByModuleId(moduleIdNum)

  // Fire on mount — endpoint is idempotent (score only updates on improvement,
  // is_unlocked only ever goes 0→1), so React 18 Strict Mode double-fire is safe.
  useEffect(() => {
    completeModule()
  }, [completeModule])

  // XP count-up animation
  useEffect(() => {
    if (!character) return
    const target = character.total_xp
    const duration = 1200
    const startTime = performance.now()
    let rafId: number
    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      setDisplayXp(Math.round(target * progress))
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [character])

  function handleReturn() {
    sessionStorage.setItem("zenkai-just-completed", moduleId)
    router.push("/world-map")
  }

  const score = completeData?.score ?? null
  const scorePercent = score !== null ? Math.round(score * 100) : null
  const nextUnlocked = completeData?.next_module_unlocked ?? false

  return (
    <div className="fixed inset-0 bg-zen-void flex flex-col select-none">
      <AppHeader />

      <div className="flex flex-col items-center justify-center flex-1 px-6 gap-8">
        {/* Location label */}
        {location && (
          <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
            {location.biome} · {location.name}
          </p>
        )}

        {/* Completion badge */}
        <div className="clipped-corners border border-zen-gold/30 bg-zen-slate px-8 py-5 text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40 mb-2">
            Module Complete
          </p>
          <h1 className="font-heading text-2xl font-bold text-zen-gold leading-tight">
            {module?.title ?? "…"}
          </h1>
          {module && (
            <p className="font-mono text-[10px] text-zen-plasma/50 mt-1">
              {module.concepts.length} concept{module.concepts.length !== 1 ? "s" : ""} studied
            </p>
          )}
        </div>

        {/* Score display — shown once completeModule resolves */}
        <AnimatePresence>
          {scorePercent !== null && (
            <motion.div
              key="score-display"
              data-testid="score-display"
              className="text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
                Comprehension Score
              </p>
              <p className="font-heading text-2xl font-bold text-zen-plasma tabular-nums mt-1">
                {scorePercent}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unlock banner */}
        <AnimatePresence>
          {nextUnlocked && (
            <motion.div
              key="unlock-banner"
              data-testid="unlock-banner"
              className="clipped-corners border border-zen-plasma/40 bg-zen-slate/60 px-6 py-3 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.15 }}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-zen-plasma">
                Next module unlocked
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Character sprite */}
        <RoninSprite animation="breathing-idle" direction="south" scale={1.2} />

        {/* XP display */}
        <div className="text-center" data-testid="xp-display">
          <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
            Total XP
          </p>
          <p className="font-heading text-3xl font-bold text-zen-gold tabular-nums mt-1">
            {displayXp}
          </p>
        </div>

        {/* Return CTA */}
        <SamuraiButton
          data-testid="return-btn"
          className="w-full max-w-xs"
          onClick={handleReturn}
        >
          Return to World Map
        </SamuraiButton>
      </div>
    </div>
  )
}
