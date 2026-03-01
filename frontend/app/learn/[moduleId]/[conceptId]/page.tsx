"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryKeys"
import { ConceptCard } from "@/components/learn/ConceptCard"
import { PredictionQuestion } from "@/components/learn/PredictionQuestion"
import { WorkedExample } from "@/components/learn/WorkedExample"
import { ConfidenceChips } from "@/components/learn/ConfidenceChips"
import { AssetPlaceholder } from "@/components/ui/AssetPlaceholder"

type Stage = "prediction" | "concept" | "example" | "confidence"

export default function LearnPage() {
  const { moduleId, conceptId } = useParams<{ moduleId: string; conceptId: string }>()
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("prediction")
  const [startMs] = useState(Date.now())
  const [predictionAnswered, setPredictionAnswered] = useState(false)

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

  const progressMutation = useMutation({
    mutationFn: api.postProgress,
    onSuccess: () => {
      const concepts = module?.concepts ?? []
      const currentIdx = concepts.findIndex((c) => c.id === conceptIdNum)
      const next = concepts[currentIdx + 1]
      if (next) {
        router.push(`/learn/${moduleId}/${next.id}`)
      } else {
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
    <div className="register-study min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/world-map`)}
            className="text-xs uppercase tracking-widest text-zinc-600 hover:text-zinc-400"
          >
            ← World Map
          </button>
          <p className="text-xs uppercase tracking-widest text-zinc-600">
            {concept.title}
          </p>
        </div>

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
                onAnswer={() => setPredictionAnswered(true)}
                revealed={false}
              />
              {predictionAnswered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex justify-end"
                >
                  <button
                    onClick={() => setStage("concept")}
                    className="text-xs font-semibold uppercase tracking-widest text-zen-plasma hover:opacity-70"
                  >
                    See the explanation →
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Stage: Concept */}
          {stage === "concept" && (
            <motion.div
              key="concept"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Character placeholder */}
              <div className="flex items-start gap-4">
                <AssetPlaceholder
                  label="Ronin sprite"
                  className="h-16 w-16 shrink-0"
                />
                <ConceptCard
                  defaultLayer={concept.default_layer}
                  deepLayer={concept.deep_layer}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStage("example")}
                  className="text-xs font-semibold uppercase tracking-widest text-zen-plasma hover:opacity-70"
                >
                  See worked example →
                </button>
              </div>
            </motion.div>
          )}

          {/* Stage: Worked example */}
          {stage === "example" && (
            <motion.div
              key="example"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <WorkedExample data={concept.worked_example} />

              <div className="flex justify-end">
                <button
                  onClick={() => setStage("confidence")}
                  className="text-xs font-semibold uppercase tracking-widest text-zen-plasma hover:opacity-70"
                >
                  Rate your confidence →
                </button>
              </div>
            </motion.div>
          )}

          {/* Stage: Confidence */}
          {stage === "confidence" && (
            <motion.div
              key="confidence"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <p className="text-sm text-zinc-400">
                How well did you know this concept?
              </p>
              <ConfidenceChips
                onSelect={handleConfidence}
                disabled={progressMutation.isPending}
              />
              {progressMutation.isPending && (
                <p className="text-xs text-zinc-600">Saving...</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
