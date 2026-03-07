"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { PredictionQuestion as PredictionQuestionType } from "@/lib/types"

interface PredictionQuestionProps {
  data: PredictionQuestionType
  onAnswer: (selectedIndex: number) => void
  revealed?: boolean
}

export function PredictionQuestion({ data, onAnswer, revealed }: PredictionQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null)

  function handleSelect(i: number) {
    if (selected !== null) return
    setSelected(i)
    onAnswer(i)
  }

  return (
    <div className="clipped-corners border border-zen-plasma/30 bg-zen-slate p-ma" data-testid="prediction-question">
      <p className="mb-1 text-xs uppercase tracking-widest text-zen-plasma/70">
        Before we begin — what&apos;s your intuition?
      </p>
      <p className="mb-5 text-sm leading-relaxed text-zinc-100">{data.question}</p>

      <div className="space-y-2">
        {data.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            disabled={selected !== null}
            data-testid={`prediction-option-${i}`}
            className={cn(
              "w-full clipped-corners-sm border px-4 py-2 text-left text-sm transition-all duration-150",
              selected === null
                ? "border-zinc-700 text-zinc-300 hover:border-zen-plasma/50 hover:text-zinc-100"
                : i === data.correct_index
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                : i === selected
                ? "border-zen-sakura/60 bg-zen-sakura/10 text-zen-sakura"
                : "border-zinc-800 text-zinc-600"
            )}
          >
            <span className="mr-3 font-mono text-zinc-500">{String.fromCharCode(65 + i)}.</span>
            {opt}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {revealed && selected !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <p className="text-xs italic text-zinc-400">{data.reveal_explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
