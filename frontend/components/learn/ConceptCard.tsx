"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { DefaultLayer, DeepLayer } from "@/lib/types"

interface ConceptCardProps {
  defaultLayer: DefaultLayer
  deepLayer: DeepLayer
  className?: string
}

export function ConceptCard({ defaultLayer, deepLayer, className }: ConceptCardProps) {
  const [isDeep, setIsDeep] = useState(false)

  return (
    <div
      className={cn(
        "relative border-l-2 border-zen-plasma bg-zen-slate clipped-corners p-ma",
        className
      )}
      data-testid="concept-card"
    >
      {/* Hook */}
      <p
        className="mb-4 text-sm font-semibold leading-relaxed text-zen-gold"
        data-testid="concept-hook"
      >
        {defaultLayer.hook}
      </p>

      {/* Explanation */}
      <div className="space-y-3">
        {defaultLayer.explanation.map((para, i) => (
          <p key={i} className="text-sm leading-relaxed text-zinc-300">
            {para}
          </p>
        ))}
      </div>

      {/* Analogy */}
      {defaultLayer.analogy && (
        <div className="mt-4 clipped-corners-sm border border-zen-plasma/30 bg-zen-void/50 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-zen-plasma/70">Analogy</p>
          <p className="mt-1 text-sm text-zinc-400">{defaultLayer.analogy}</p>
        </div>
      )}

      {/* Go Deeper toggle */}
      <button
        onClick={() => setIsDeep((v) => !v)}
        className="mt-5 text-xs font-semibold uppercase tracking-widest text-zen-plasma transition-opacity hover:opacity-70"
        data-testid="go-deeper-btn"
      >
        {isDeep ? "▲ Close Scroll" : "▼ Go Deeper"}
      </button>

      {/* Deep layer */}
      <AnimatePresence>
        {isDeep && (
          <motion.div
            key="deep"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
            data-testid="deep-layer"
          >
            <div className="mt-5 space-y-4 border-t border-zen-plasma/20 pt-5">
              {/* Mechanism */}
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-zen-plasma/70">
                  Mechanism
                </p>
                <ol className="space-y-1 text-sm text-zinc-300">
                  {deepLayer.mechanism.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-zen-plasma/50">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Key number */}
              <div className="clipped-corners-sm border border-zen-gold/30 bg-zen-void/50 px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-zen-gold/70">Key number</p>
                <p className="mt-1 text-sm font-semibold text-zen-gold">{deepLayer.key_number}</p>
              </div>

              {/* Edge cases */}
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-zen-plasma/70">
                  Edge cases
                </p>
                <ul className="space-y-1 text-sm text-zinc-400">
                  {deepLayer.edge_cases.map((ec, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-zen-sakura/50">⚠</span>
                      {ec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Failure story */}
              <div className="clipped-corners-sm border border-zen-sakura/20 bg-zen-void/50 px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-zen-sakura/70">
                  Failure story
                </p>
                <p className="mt-1 text-sm italic text-zinc-400">{deepLayer.failure_story}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
