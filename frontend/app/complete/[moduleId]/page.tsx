"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
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

  const [quizScore, setQuizScore] = useState<string | null>(null)
  const [displayXp, setDisplayXp] = useState(0)
  const animatedRef = useRef(false)

  const { data: character } = useQuery({
    queryKey: queryKeys.character(),
    queryFn: api.getCharacter,
  })

  const { data: module } = useQuery({
    queryKey: queryKeys.module(moduleIdNum),
    queryFn: () => api.getModule(moduleIdNum),
  })

  const location = getLocationByModuleId(moduleIdNum)

  // Read quiz score from sessionStorage (set by quiz page if a review was done)
  useEffect(() => {
    const stored = sessionStorage.getItem("zenkai-quiz-score")
    if (stored) {
      setQuizScore(stored)
      sessionStorage.removeItem("zenkai-quiz-score")
    }
  }, [])

  // XP count-up animation
  useEffect(() => {
    if (!character || animatedRef.current) return
    animatedRef.current = true
    const target = character.total_xp
    const duration = 1200
    const startTime = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      setDisplayXp(Math.round(target * progress))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [character])

  function handleReturn() {
    sessionStorage.setItem("zenkai-just-completed", moduleId)
    router.push("/world-map")
  }

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

        {/* Quiz score — only if a review quiz was taken this session */}
        <AnimatePresence>
          {quizScore && (
            <motion.div
              data-testid="quiz-score"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-[10px] text-zen-plasma/50 tracking-widest"
            >
              Review score: {quizScore}
            </motion.div>
          )}
        </AnimatePresence>

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
