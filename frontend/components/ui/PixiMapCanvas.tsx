"use client"

import { useEffect, useRef } from "react"
import { Application, Sprite, Graphics, ColorMatrixFilter, Ticker } from "pixi.js"
import { addBiomeParticles } from "@/lib/mapParticles"
import type { WorldMapLocation } from "@/lib/worldMapConfig"
import type { Module } from "@/lib/types"

const MAP_WIDTH = 800
const MAP_HEIGHT = 4500
const SCROLL_KEY = "world-map-scroll"

interface PixiMapCanvasProps {
  locations: WorldMapLocation[]
  modules: Module[]
  currentModuleId: number
  onLocationTap: (moduleId: number) => void
  headerHeight: number
}

/**
 * Draws a radial glow halo behind a location sprite using Graphics.
 * This is a v8-native alternative to @pixi/filter-glow (which requires
 * the v7-era @pixi/core package that is not installed).
 *
 * Returns the Graphics node so the caller can animate outerStrength.
 */
function createGlowGraphic(color: number, radius: number): Graphics {
  const g = new Graphics()
  // Layered concentric circles from outer (faint) to inner (brighter) for a
  // soft halo feel that approximates the GlowFilter visual.
  const layers = 6
  for (let i = layers; i >= 1; i--) {
    const layerRadius = radius * (i / layers)
    const alpha = (0.06 + (layers - i) * 0.04) * (i / layers)
    g.circle(0, 0, layerRadius).fill({ color, alpha })
  }
  return g
}

export function PixiMapCanvas({
  locations,
  modules,
  currentModuleId,
  onLocationTap,
  headerHeight,
}: PixiMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let app: Application | null = null
    const cleanupHandlers: (() => void)[] = []

    async function init() {
      const canvasH = window.innerHeight - headerHeight
      app = new Application()

      await app.init({
        width: window.innerWidth,
        height: canvasH,
        background: 0x0d1117,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: false,
      })

      // containerRef may have unmounted while awaiting init
      if (!containerRef.current) {
        app.destroy()
        return
      }

      containerRef.current.appendChild(app.canvas as HTMLCanvasElement)

      const scale = window.innerWidth / MAP_WIDTH
      app.stage.scale.set(scale)

      // Background image — placeholder-safe: if file is missing, sprite stays blank
      const bg = Sprite.from("/assets/map/world-map-bg.png")
      bg.width = MAP_WIDTH
      bg.height = MAP_HEIGHT
      app.stage.addChild(bg)

      // ── Scroll state ──────────────────────────────────────────────────────────
      const minY = -(MAP_HEIGHT * scale - canvasH)
      const clamp = (y: number) => Math.min(0, Math.max(minY, y))

      const savedScroll = sessionStorage.getItem(SCROLL_KEY)
      const isFirstVisit = !savedScroll

      let scrollY: number
      if (savedScroll) {
        scrollY = clamp(parseFloat(savedScroll))
      } else {
        const currentLoc = locations.find((l) => l.moduleId === currentModuleId)
        scrollY = currentLoc
          ? clamp(-(currentLoc.y * scale - canvasH / 2))
          : minY
      }

      app.stage.y = scrollY

      // ── Entrance animation (first visit only — zoom out from current location) ─
      if (isFirstVisit) {
        const currentLoc = locations.find((l) => l.moduleId === currentModuleId)
        if (currentLoc) {
          const startScale = scale * 1.5
          const targetY = scrollY
          app.stage.scale.set(startScale)
          app.stage.y = clamp(-(currentLoc.y * startScale - canvasH / 2))

          const DURATION = 1200
          let elapsed = 0

          const entranceTick = (ticker: Ticker) => {
            elapsed += ticker.deltaMS
            const p = Math.min(elapsed / DURATION, 1)
            // cubic ease-out
            const eased = 1 - Math.pow(1 - p, 3)
            app!.stage.scale.set(startScale - scale * 0.5 * eased)
            app!.stage.y = clamp(
              (startScale - scale * 0.5 * eased) *
                (-currentLoc.y + canvasH / 2 / startScale) *
                eased +
                (1 - eased) *
                  clamp(-(currentLoc.y * startScale - canvasH / 2)) +
                eased * targetY
            )
            if (p >= 1) {
              app!.stage.scale.set(scale)
              app!.stage.y = targetY
              app!.ticker.remove(entranceTick)
            }
          }
          app.ticker.add(entranceTick)
        }
      }

      // ── Wheel scroll ──────────────────────────────────────────────────────────
      function onWheel(e: WheelEvent) {
        scrollY = clamp(app!.stage.y - e.deltaY)
        app!.stage.y = scrollY
        sessionStorage.setItem(SCROLL_KEY, String(scrollY))
      }
      ;(app.canvas as HTMLCanvasElement).addEventListener("wheel", onWheel)
      cleanupHandlers.push(() =>
        (app!.canvas as HTMLCanvasElement).removeEventListener("wheel", onWheel)
      )

      // ── Touch scroll ──────────────────────────────────────────────────────────
      let touchStartY = 0
      function onTouchStart(e: TouchEvent) {
        touchStartY = e.touches[0].clientY
      }
      function onTouchMove(e: TouchEvent) {
        const dy = e.touches[0].clientY - touchStartY
        touchStartY = e.touches[0].clientY
        scrollY = clamp(app!.stage.y + dy)
        app!.stage.y = scrollY
        sessionStorage.setItem(SCROLL_KEY, String(scrollY))
      }
      ;(app.canvas as HTMLCanvasElement).addEventListener(
        "touchstart",
        onTouchStart
      )
      ;(app.canvas as HTMLCanvasElement).addEventListener(
        "touchmove",
        onTouchMove
      )
      cleanupHandlers.push(() => {
        ;(app!.canvas as HTMLCanvasElement).removeEventListener(
          "touchstart",
          onTouchStart
        )
        ;(app!.canvas as HTMLCanvasElement).removeEventListener(
          "touchmove",
          onTouchMove
        )
      })

      // ── Location sprites ──────────────────────────────────────────────────────
      for (const location of locations) {
        const mod = modules.find((m) => m.id === location.moduleId)
        if (!mod) continue

        // Glow halo drawn BEFORE the sprite so it renders behind it
        if (mod.is_unlocked) {
          const glowColor =
            mod.quiz_score_achieved !== null
              ? 0xffe066 // completed: gold
              : 0x81d4fa // current/available: sky blue

          const glowRadius = mod.quiz_score_achieved !== null ? 40 : 48
          const glowGraphic = createGlowGraphic(glowColor, glowRadius)
          glowGraphic.x = location.x
          glowGraphic.y = location.y
          app.stage.addChild(glowGraphic)

          // Pulse animation for the active (not-yet-completed) location
          if (mod.quiz_score_achieved === null) {
            let t = 0
            const pulseTick = (ticker: Ticker) => {
              t += ticker.deltaTime * 0.03
              glowGraphic.alpha = 0.7 + Math.sin(t) * 0.3
            }
            app.ticker.add(pulseTick)
          }
        }

        // Sprite
        const sprite = Sprite.from(location.spriteUrl)
        sprite.width = 64
        sprite.height = 64
        sprite.anchor.set(0.5)
        sprite.x = location.x
        sprite.y = location.y

        if (!mod.is_unlocked) {
          // Greyed-out desaturated appearance for locked modules
          const grey = new ColorMatrixFilter()
          grey.desaturate()
          sprite.filters = [grey]
          sprite.alpha = 0.4
        }

        sprite.eventMode = "static"
        sprite.cursor = "pointer"
        sprite.on("pointertap", () => {
          if (navigator.vibrate) navigator.vibrate(10)
          onLocationTap(location.moduleId)
        })

        app.stage.addChild(sprite)

        // Biome particles rendered on top of the sprite
        addBiomeParticles(app, location.particleType, location.x, location.y)
      }

      // ── Test hook ─────────────────────────────────────────────────────────────
      // Allows Playwright to trigger location taps without WebGL pointer interaction
      if (process.env.NODE_ENV !== "production") {
        ;(
          window as Window & {
            __zenkaiTapModule?: (id: number) => void
          }
        ).__zenkaiTapModule = (moduleId: number) => {
          if (navigator.vibrate) navigator.vibrate(10)
          onLocationTap(moduleId)
        }
      }
    }

    init().catch((err: unknown) => {
      console.error("[PixiMapCanvas] init failed:", err)
    })

    return () => {
      cleanupHandlers.forEach((fn) => fn())
      if (app) {
        app.destroy()
      }
    }
  }, [locations, modules, currentModuleId, onLocationTap, headerHeight])

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: headerHeight,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    />
  )
}
