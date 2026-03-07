"use client"

import { cn } from "@/lib/utils"
import type { ProgressPayload } from "@/lib/types"

type Confidence = ProgressPayload["confidence"]

interface ConfidenceChipsProps {
  onSelect: (confidence: Confidence) => void
  disabled?: boolean
}

const chips: Array<{ value: Confidence; label: string; icon: string; className: string; testId: string }> = [
  {
    value: "guessed",
    label: "Guessed",
    icon: "🕯",
    className: "border-zinc-600 text-zinc-400 hover:border-zinc-400",
    testId: "confidence-guessed",
  },
  {
    value: "somewhat_sure",
    label: "Somewhat sure",
    icon: "🔥",
    className: "border-amber-600/60 text-amber-400 hover:border-amber-400 hover:shadow-[0_0_8px_rgba(251,191,36,0.3)]",
    testId: "confidence-somewhat-sure",
  },
  {
    value: "knew_it",
    label: "Knew it",
    icon: "⚡",
    className: "border-zen-plasma/60 text-zen-plasma hover:border-zen-plasma hover:shadow-[0_0_8px_rgba(122,162,247,0.4)]",
    testId: "confidence-knew-it",
  },
]

export function ConfidenceChips({ onSelect, disabled }: ConfidenceChipsProps) {
  return (
    <div className="flex gap-3" role="group" aria-label="Rate your confidence">
      {chips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onSelect(chip.value)}
          disabled={disabled}
          data-testid={chip.testId}
          className={cn(
            "clipped-corners-sm flex items-center gap-2 border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-150",
            chip.className,
            disabled && "cursor-not-allowed opacity-40"
          )}
        >
          <span>{chip.icon}</span>
          {chip.label}
        </button>
      ))}
    </div>
  )
}
