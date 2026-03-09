"use client"

import { motion } from "framer-motion"
import { SamuraiButton } from "@/components/ui/SamuraiButton"
import type { WorldMapLocation } from "@/lib/worldMapConfig"

interface PanelModule {
  id: number
  title: string
  is_unlocked: boolean
  quiz_score_achieved: number | null
  order_index: number
  concepts: { id: number }[]
}

interface LocationPanelProps {
  location: WorldMapLocation
  module: PanelModule
  onEnter: () => void
  onDismiss: () => void
  /** When true, shows a loading skeleton instead of module detail */
  loading?: boolean
}

export function LocationPanel({ location, module, onEnter, onDismiss, loading = false }: LocationPanelProps) {
  const totalCount = module.concepts.length
  const isCompleted = module.quiz_score_achieved !== null

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Invisible backdrop for dismiss */}
      <div
        data-testid="panel-backdrop"
        className="absolute inset-0"
        onClick={onDismiss}
      />

      {/* Slide-up panel */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 clipped-corners bg-zen-slate border-t border-zen-plasma/20 px-6 pt-5 pb-10"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Drag handle + dismiss row */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-1 w-10 rounded-full bg-zen-plasma/20 mx-auto" />
          <button
            data-testid="panel-dismiss-btn"
            onClick={onDismiss}
            className="absolute right-4 top-4 clipped-corners-sm px-2 py-1 font-mono text-[10px] text-zen-plasma/40 hover:text-zen-plasma/80 hover:bg-zen-plasma/10 transition-colors"
            aria-label="Close panel"
          >
            &#x2715;
          </button>
        </div>

        <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
          {location.biome}
        </p>
        <h2 className="font-heading text-xl font-bold text-zen-gold mt-0.5">
          {location.name}
        </h2>

        {loading ? (
          <div data-testid="panel-loading" className="mt-4 space-y-3 animate-pulse">
            <div className="h-4 w-48 bg-zinc-700 clipped-corners-sm" />
            <div className="flex gap-1 mt-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-1 flex-1 clipped-corners-sm bg-zinc-700" />
              ))}
            </div>
            <div className="h-10 w-full bg-zinc-800 clipped-corners-sm mt-5" />
          </div>
        ) : (
          <>
            <p className="font-heading text-base text-zinc-300 mt-0.5">{module.title}</p>

            {/* Concept progress bar */}
            {totalCount > 0 && (
              <div className="mt-4">
                <div className="flex gap-1">
                  {Array.from({ length: totalCount }, (_, i) => (
                    <div key={i} className="h-1 flex-1 clipped-corners-sm bg-zinc-700" />
                  ))}
                </div>
                <p className="font-mono text-[9px] text-zen-plasma/40 mt-1">
                  {totalCount} concepts
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="mt-5">
              {module.is_unlocked ? (
                <SamuraiButton className="w-full" onClick={onEnter}>
                  {isCompleted ? "Revisit Dōjō" : "Enter Dōjō"}
                </SamuraiButton>
              ) : (
                <div className="clipped-corners border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-center">
                  <p className="font-mono text-xs text-zinc-600 uppercase tracking-widest">
                    Locked — complete the previous module first
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
