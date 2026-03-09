"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryKeys"
import { ConceptCard } from "@/components/learn/ConceptCard"
import { PredictionQuestion } from "@/components/learn/PredictionQuestion"
import { ConfidenceChips } from "@/components/learn/ConfidenceChips"
import { RoninSprite } from "@/components/ui/RoninSprite"
import { AppHeader } from "@/components/ui/AppHeader"

type Stage = "prediction" | "concept"

export default function LearnPage() {
  const { moduleId, conceptId } = useParams<{ moduleId: string; conceptId: string }>()
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("prediction")
  const [startMs] = useState(Date.now())
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (revealTimerRef.current !== null) {
        clearTimeout(revealTimerRef.current)
      }
    }
  }, [])

  const conceptIdNum = Number(conceptId)
  const moduleIdNum = Number(moduleId)

  const { data: concept, isLoading, error } = useQuery({
    queryKey: queryKeys.concept(conceptIdNum),
    queryFn: () => api.getConcept(conceptIdNum),
  })

  const { data: module } = useQuery({
    queryKey: queryKeys.module(moduleIdNum),
    queryFn: () => api.getModule(moduleIdNum),
  })

  const concepts = module?.concepts ?? []
  const currentIdx = concepts.findIndex((c) => c.id === conceptIdNum)

  const progressMutation = useMutation({
    mutationFn: api.postProgress,
    onSuccess: () => {
      const concepts = module?.concepts ?? []
      const currentIdx = concepts.findIndex((c) => c.id === conceptIdNum)
      const next = concepts[currentIdx + 1]
      if (next) {
        router.push(`/learn/${moduleId}/${next.id}`)
      } else {
        sessionStorage.setItem("zenkai-just-completed", String(moduleIdNum))
        router.push(`/world-map`)
      }
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Loading...</p>
      </div>
    )
  }

  if (error || !concept) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zen-sakura text-sm">Failed to load concept.</p>
      </div>
    )
  }

  function handleConfidence(confidence: "knew_it" | "somewhat_sure" | "guessed") {
    progressMutation.mutate({
      user_id: 1,
      concept_id: conceptIdNum,
      answered_correctly: true,
      confidence,
      time_spent_ms: Date.now() - startMs,
    })
  }

  return (
    <>
      <AppHeader
        backHref="/world-map"
        backLabel="Exit"
        onBack={() => router.push("/world-map")}
      />
    <div className="register-study min-h-[100dvh] px-6 pt-[104px] pb-10">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Module progress bar */}
        {module && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {concepts.map((c, i) => (
                <motion.div
                  key={c.id}
                  layout
                  className={`h-[3px] flex-1 clipped-corners-sm transition-colors duration-500 ${
                    i < currentIdx
                      ? "bg-zen-plasma"
                      : i === currentIdx
                      ? "bg-zen-gold"
                      : "bg-zinc-800"
                  }`}
                />
              ))}
            </div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
              Concept {currentIdx + 1} of {concepts.length} · {module.title}
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Stage: Prediction */}
          {stage === "prediction" && (
            <motion.div
              key="prediction"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <PredictionQuestion
                data={concept.prediction_question}
                onAnswer={() => {
                  // Delay 1500ms so the color-coded reveal and explanation are visible
                  revealTimerRef.current = setTimeout(() => setStage("concept"), 1500)
                }}
                revealed={true}
              />
            </motion.div>
          )}

          {/* Stage: Concept — card + confidence chips always visible together */}
          {stage === "concept" && (
            <motion.div
              key="concept"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="flex items-start gap-4">
                <RoninSprite animation="breathing-idle" direction="south" scale={1} className="shrink-0" />
                <ConceptCard
                  defaultLayer={concept.default_layer}
                  deepLayer={concept.deep_layer}
                />
              </div>

              <div className="space-y-3 border-t border-zinc-800 pt-5">
                <p className="text-sm text-zinc-400">How well did you know this?</p>
                <ConfidenceChips
                  onSelect={handleConfidence}
                  disabled={progressMutation.isPending}
                />
                {progressMutation.isPending && (
                  <p className="text-xs text-zinc-600">Saving...</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  )
}
