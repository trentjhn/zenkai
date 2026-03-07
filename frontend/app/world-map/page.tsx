"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryKeys"
import { AppHeader, APP_HEADER_HEIGHT } from "@/components/ui/AppHeader"
import { PixiMapCanvas } from "@/components/ui/PixiMapCanvas"
import { LocationPanel } from "@/components/ui/LocationPanel"
import { LOCATIONS, getLocationByModuleId } from "@/lib/worldMapConfig"
import type { ModuleDetail } from "@/lib/types"

const HEADER_HEIGHT = APP_HEADER_HEIGHT

export default function WorldMapPage() {
  const router = useRouter()
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  const [biomeFlashColor, setBiomeFlashColor] = useState<number | null>(null)
  const [showCompletionFlash, setShowCompletionFlash] = useState(false)
  const [selectedModuleDetail, setSelectedModuleDetail] = useState<ModuleDetail | null>(null)

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: queryKeys.modules(),
    queryFn: api.getModules,
  })

  const { data: character, isLoading: charLoading } = useQuery({
    queryKey: queryKeys.character(),
    queryFn: api.getCharacter,
  })

  // Module completion celebration trigger
  useEffect(() => {
    const completed = sessionStorage.getItem("zenkai-just-completed")
    if (completed) {
      setShowCompletionFlash(true)
      sessionStorage.removeItem("zenkai-just-completed")
      setTimeout(() => setShowCompletionFlash(false), 600)
    }
  }, [])

  // Current module = first learnable (mapped in LOCATIONS) unlocked module without a quiz score.
  // Excludes "AI PM Foundations" (DB id 1) which is KB context, not a learnable module.
  const locationIds = new Set(LOCATIONS.map((l) => l.moduleId))
  const currentModuleId =
    modules?.find((m) => locationIds.has(m.id) && m.is_unlocked && m.quiz_score_achieved === null)?.id ??
    LOCATIONS[0].moduleId

  const selectedLocation = selectedModuleId ? getLocationByModuleId(selectedModuleId) : null

  async function handleLocationTap(moduleId: number) {
    setSelectedModuleId(moduleId)
    const detail = await api.getModule(moduleId)
    setSelectedModuleDetail(detail)
  }

  async function handleEnterDojo() {
    if (!selectedModuleId || !selectedLocation || !selectedModuleDetail) return
    setBiomeFlashColor(selectedLocation.accentColor)
    const first = selectedModuleDetail.concepts[0]
    if (first) {
      setTimeout(() => router.push(`/learn/${selectedModuleId}/${first.id}`), 500)
    }
  }

  // Loading state
  if (modulesLoading || charLoading) {
    return (
      <div className="fixed inset-0 bg-zen-void flex flex-col items-center justify-center gap-3 select-none">
        <motion.div
          className="w-8 h-8 border-2 border-zen-plasma/30 border-t-zen-gold rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="font-mono text-[10px] uppercase tracking-widest text-zen-plasma/40">
          Preparing the path...
        </p>
      </div>
    )
  }

  // Error state
  if (!modules || !character) {
    return (
      <div className="fixed inset-0 bg-zen-void flex flex-col items-center justify-center gap-5 select-none">
        <div className="clipped-corners border border-zen-sakura/20 bg-zen-slate px-8 py-6 text-center max-w-xs">
          <p className="font-heading text-zen-gold text-base">The path is obscured.</p>
          <p className="font-mono text-[10px] text-zen-plasma/40 mt-1 tracking-widest">
            Could not reach the server.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="font-mono text-[10px] uppercase tracking-widest text-zen-plasma/60 hover:text-zen-plasma transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-zen-void select-none">
      <AppHeader character={character} targetXp={character.total_xp} />

      <PixiMapCanvas
        locations={LOCATIONS}
        modules={modules}
        currentModuleId={currentModuleId}
        onLocationTap={handleLocationTap}
        headerHeight={HEADER_HEIGHT}
      />

      {/* Location slide-up panel */}
      <AnimatePresence>
        {selectedModuleId && selectedModuleDetail && selectedLocation && (
          <LocationPanel
            key={selectedModuleId}
            location={selectedLocation}
            module={selectedModuleDetail}
            onEnter={handleEnterDojo}
            onDismiss={() => { setSelectedModuleId(null); setSelectedModuleDetail(null) }}
          />
        )}
      </AnimatePresence>

      {/* Enter Dojo — biome color flash */}
      <AnimatePresence>
        {biomeFlashColor !== null && (
          <motion.div
            className="fixed inset-0 z-[500] pointer-events-none"
            style={{ backgroundColor: `#${biomeFlashColor.toString(16).padStart(6, "0")}` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onAnimationComplete={() => setBiomeFlashColor(null)}
          />
        )}
      </AnimatePresence>

      {/* Module completion — white flash */}
      <AnimatePresence>
        {showCompletionFlash && (
          <motion.div
            className="fixed inset-0 z-[600] pointer-events-none bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
