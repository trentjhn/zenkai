"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { WorkedExample as WorkedExampleType } from "@/lib/types"

interface WorkedExampleProps {
  data: WorkedExampleType
}

const ARTIFACT_LABELS: Record<WorkedExampleType["artifact_type"], string> = {
  prompt: "Prompt",
  architecture_diagram: "Architecture",
  code_snippet: "Code",
  comparison: "Comparison",
}

export function WorkedExample({ data }: WorkedExampleProps) {
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-zen-gold/70">
        Worked example — {ARTIFACT_LABELS[data.artifact_type]}
      </p>

      {/* Artifact frame — paper texture feel via border pattern */}
      <div className="relative clipped-corners border border-zen-gold/20 bg-zinc-900/80 p-5">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300">
          {data.artifact}
        </pre>

        {/* Annotation markers — floating tags */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
          {data.annotations.map((ann, i) => (
            <button
              key={i}
              onClick={() => setActiveAnnotation(activeAnnotation === i ? null : i)}
              className={cn(
                "clipped-corners-sm border px-3 py-1 text-xs transition-all duration-150",
                activeAnnotation === i
                  ? "border-zen-gold bg-zen-gold/10 text-zen-gold"
                  : "border-zinc-700 text-zinc-500 hover:border-zen-gold/50 hover:text-zinc-300"
              )}
            >
              ⬡ {i + 1}
            </button>
          ))}
        </div>

        {/* Active annotation speech bubble */}
        <AnimatePresence>
          {activeAnnotation !== null && (
            <motion.div
              key={activeAnnotation}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="mt-3 clipped-corners-sm border border-zen-gold/30 bg-zen-void px-4 py-3"
            >
              <p className="mb-1 text-xs font-semibold text-zen-gold">
                {data.annotations[activeAnnotation].reference}
              </p>
              <p className="text-xs text-zinc-400">
                {data.annotations[activeAnnotation].explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
