"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryKeys"
import { QuizBattleCard, type QuizQuestion } from "@/components/learn/QuizBattleCard"
import { ConfidenceChips } from "@/components/learn/ConfidenceChips"
import { AssetPlaceholder } from "@/components/ui/AssetPlaceholder"
import { AppHeader } from "@/components/ui/AppHeader"

type Phase = "question" | "confidence"

export default function QuizPage() {
  const { conceptId } = useParams<{ conceptId: string }>()
  const router = useRouter()
  const conceptIdNum = Number(conceptId)

  const [qIndex, setQIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("question")
  const [lastCorrect, setLastCorrect] = useState(false)
  const [startMs] = useState(Date.now())

  const { data: questions, isLoading } = useQuery({
    queryKey: [...queryKeys.concept(conceptIdNum), "quiz"],
    queryFn: async () => {
      const raw = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/concepts/${conceptIdNum}/quiz`
      )
      if (!raw.ok) return []
      const rows: Array<{ id: number; content: string | QuizQuestion }> = await raw.json()
      return rows.map((r) => {
        const content: QuizQuestion =
          typeof r.content === "string" ? JSON.parse(r.content) : r.content
        return { ...content, id: r.id }
      })
    },
  })

  const progressMutation = useMutation({
    mutationFn: api.postProgress,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Loading...</p>
      </div>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="register-battle flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-zinc-400">No quiz questions generated yet for this concept.</p>
        <button
          onClick={() => router.back()}
          className="text-xs uppercase tracking-widest text-zen-plasma hover:opacity-70"
        >
          ← Go back
        </button>
      </div>
    )
  }

  const current = questions[qIndex]
  const isLast = qIndex === questions.length - 1

  function handleAnswer(selectedIndex: number, correct: boolean) {
    setLastCorrect(correct)
    setPhase("confidence")
  }

  function handleConfidence(confidence: "knew_it" | "somewhat_sure" | "guessed") {
    progressMutation.mutate({
      user_id: 1,
      concept_id: conceptIdNum,
      answered_correctly: lastCorrect,
      confidence,
      time_spent_ms: Math.round((Date.now() - startMs) / questions!.length),
    })

    if (isLast) {
      router.push(`/world-map`)
    } else {
      setQIndex((i) => i + 1)
      setPhase("question")
    }
  }

  return (
    <>
      <AppHeader
        backHref="/world-map"
        backLabel="Exit"
        onBack={() => router.push("/world-map")}
      />
    <div className="register-battle min-h-screen px-6 pt-[104px] pb-10">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Segmented progress bar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1 w-8 clipped-corners-sm transition-colors duration-300 ${
                  i < qIndex
                    ? "bg-zen-plasma"
                    : i === qIndex
                    ? "bg-zen-gold"
                    : "bg-zinc-700"
                }`}
              />
            ))}
          </div>
          <p className="text-xs uppercase tracking-widest text-zinc-600">
            {qIndex + 1} / {questions.length}
          </p>
        </div>

        {/* Battle arena */}
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <div className="space-y-5">
            {/* Card stays mounted so answer-feedback remains visible during confidence phase */}
            <QuizBattleCard key={qIndex} question={current} onAnswer={handleAnswer} />
            <AnimatePresence>
              {phase === "confidence" && (
                <motion.div
                  key={`conf-${qIndex}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-zinc-400">How confident were you?</p>
                  <ConfidenceChips
                    onSelect={handleConfidence}
                    disabled={progressMutation.isPending}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Character placeholder — battle idle */}
          <AssetPlaceholder
            label="Battle sprite"
            className="h-24 w-16 shrink-0 self-start"
          />
        </div>
      </div>
    </div>
    </>
  )
}
