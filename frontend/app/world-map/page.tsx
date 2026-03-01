"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryKeys"
import { AssetPlaceholder } from "@/components/ui/AssetPlaceholder"
import { SamuraiButton } from "@/components/ui/SamuraiButton"
import { cn } from "@/lib/utils"
import type { Module } from "@/lib/types"

const FORM_NAMES: Record<number, string> = {
  1: "Ronin",
  2: "Warrior",
  3: "Samurai",
  4: "The Ghost",
}

export default function WorldMapPage() {
  const router = useRouter()

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: queryKeys.modules(),
    queryFn: api.getModules,
  })

  const { data: character, isLoading: charLoading } = useQuery({
    queryKey: queryKeys.character(),
    queryFn: api.getCharacter,
  })

  if (modulesLoading || charLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Loading...</p>
      </div>
    )
  }

  async function enterModule(module: Module) {
    const detail = await api.getModule(module.id)
    const first = detail.concepts[0]
    if (first) {
      router.push(`/learn/${module.id}/${first.id}`)
    }
  }

  return (
    <div className="register-study min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header — character status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AssetPlaceholder label="Samurai sprite" className="h-14 w-10" />
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                {FORM_NAMES[character?.character_form ?? 1]}
              </p>
              <p className="text-sm font-semibold text-zen-gold">
                {character?.total_xp ?? 0} XP
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/review")}
              className="text-xs uppercase tracking-widest text-zen-plasma hover:opacity-70"
            >
              Review Queue
            </button>
          </div>
        </div>

        {/* Map placeholder */}
        <AssetPlaceholder label="World map" className="h-48 w-full" />

        {/* Module region list */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-zinc-600">Modules</p>
          <div className="space-y-2">
            {modules?.map((module, i) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                data-testid={`module-${module.order_index}`}
                className={cn(
                  "clipped-corners flex items-center justify-between border px-5 py-4",
                  module.is_unlocked
                    ? "border-zen-plasma/30 bg-zen-slate"
                    : "border-zinc-800 bg-zinc-900/50"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Fog indicator */}
                  <div
                    className={cn(
                      "h-2 w-2 clipped-corners-sm",
                      module.is_unlocked ? "bg-zen-plasma" : "bg-zinc-700"
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        module.is_unlocked ? "text-zinc-100" : "text-zinc-600"
                      )}
                    >
                      {module.title}
                    </p>
                    {module.quiz_score_achieved !== null && (
                      <p className="text-xs text-zinc-500">
                        Best: {Math.round((module.quiz_score_achieved ?? 0) * 100)}%
                      </p>
                    )}
                  </div>
                </div>

                {module.is_unlocked ? (
                  <SamuraiButton
                    variant="ghost"
                    onClick={() => enterModule(module)}
                    className="py-1 text-xs"
                  >
                    {module.quiz_score_achieved !== null ? "Revisit Dōjō" : "Enter Dōjō"}
                  </SamuraiButton>
                ) : (
                  <span className="text-xs uppercase tracking-widest text-zinc-700">
                    Locked
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
