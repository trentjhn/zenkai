"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export interface QuizQuestion {
  id?: number
  type: string
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

interface QuizBattleCardProps {
  question: QuizQuestion
  onAnswer: (selectedIndex: number, correct: boolean) => void
}

export function QuizBattleCard({ question, onAnswer }: QuizBattleCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const isRevealed = selected !== null

  function handleSelect(i: number) {
    if (isRevealed) return
    setSelected(i)
    onAnswer(i, i === question.correct_index)
  }

  return (
    <div className="space-y-5" data-testid="quiz-question">
      <p className="text-base font-semibold leading-relaxed text-zinc-100">
        {question.question}
      </p>

      <div className="grid gap-3">
        {question.options.map((opt, i) => (
          <motion.button
            key={i}
            onClick={() => handleSelect(i)}
            disabled={isRevealed}
            whileTap={!isRevealed ? { scale: 0.98 } : {}}
            data-testid={`quiz-option-${i}`}
            className={cn(
              "clipped-corners border px-5 py-3 text-left text-sm transition-all duration-200",
              !isRevealed && "border-zinc-700 text-zinc-300 hover:border-zen-sakura/60 hover:bg-zen-sakura/5",
              isRevealed && i === question.correct_index &&
                "border-emerald-500/70 bg-emerald-500/10 text-emerald-300",
              isRevealed && i === selected && i !== question.correct_index &&
                "border-zen-sakura/70 bg-zen-sakura/10 text-zen-sakura",
              isRevealed && i !== selected && i !== question.correct_index &&
                "border-zinc-800 text-zinc-600"
            )}
          >
            <span className="mr-3 font-mono text-zinc-500">{String.fromCharCode(65 + i)}.</span>
            {opt}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {isRevealed && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="clipped-corners border border-zinc-700 bg-zen-void p-4"
            data-testid="answer-feedback"
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {selected === question.correct_index ? "✓ Correct" : "✗ Incorrect"}
            </p>
            <p className="text-sm text-zinc-400">{question.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
