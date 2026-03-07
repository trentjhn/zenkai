"use client"

import { useEffect, useRef } from "react"
import { Application, Assets, Sprite, Graphics, ColorMatrixFilter, Ticker } from "pixi.js"
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
 * Draws a pixel-art octagonal badge frame (cut-corner square).
 * The octagon shape echoes Zenkai's clipped-corners design language.
 * Both outer and inner polygons share the same cut ratio so the
 * border thickness is visually uniform on all 8 sides.
 */
function drawOctBadge(
  g: Graphics,
  size: number,
  borderColor: number,
  innerColor: number,
): void {
  const h   = size / 2
  const cut = Math.round(size * 0.18)
  const b   = 5 // border thickness in px

  // Outer octagon
  g.poly([
    -h + cut, -h,
     h - cut, -h,
     h,       -h + cut,
     h,        h - cut,
     h - cut,  h,
    -h + cut,  h,
    -h,        h - cut,
    -h,       -h + cut,
  ]).fill({ color: borderColor })

  // Inner octagon (creates the border effect by overlapping in a darker color)
  const ih = h - b
  const ic = Math.max(1, cut - b)
  g.poly([
    -ih + ic, -ih,
     ih - ic, -ih,
     ih,      -ih + ic,
     ih,       ih - ic,
     ih - ic,  ih,
    -ih + ic,  ih,
    -ih,       ih - ic,
    -ih,      -ih + ic,
  ]).fill({ color: innerColor })
}

/**
 * 3-point pixel crown drawn as a child of the completed-state badge.
 * Positioned to peek above the top edge of the badge.
 */
function drawPixelCrown(g: Graphics, color: number): void {
  const p = 3
  g.rect(-p * 4,      0, p * 8, p * 2).fill({ color }) // base bar
  g.rect(-p * 4, -p * 3, p * 2, p * 3).fill({ color }) // left point
  g.rect(-p,     -p * 5, p * 2, p * 5).fill({ color }) // center point (tallest)
  g.rect( p * 2, -p * 3, p * 2, p * 3).fill({ color }) // right point
  // Accent gems on each point tip
  g.rect(-p * 3.5, -p * 3.5, p, p).fill({ color: 0xffeebb })
  g.rect(-p * 0.5, -p * 5.5, p, p).fill({ color: 0xffeebb })
  g.rect( p * 2.5, -p * 3.5, p, p).fill({ color: 0xffeebb })
}

/**
 * Downward-pointing pixel chevron that bounces above the active location.
 * The V-shape directs the eye toward the current module badge.
 */
function drawActiveIndicator(g: Graphics, color: number): void {
  const p = 4
  g.rect(-p * 2.5,  0, p, p).fill({ color })
  g.rect(-p * 1.5,  0, p, p).fill({ color })
  g.rect(-p * 0.5,  p, p, p).fill({ color })
  g.rect( p * 0.5,  0, p, p).fill({ color })
  g.rect( p * 1.5,  0, p, p).fill({ color })
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
    let initialized = false
    let cancelled   = false
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

      // Guard: cleanup may have fired while init was awaiting (React Strict Mode)
      if (cancelled || !containerRef.current) {
        app.destroy()
        return
      }
      initialized = true

      containerRef.current.appendChild(app.canvas as HTMLCanvasElement)

      const scale = window.innerWidth / MAP_WIDTH
      app.stage.scale.set(scale)

      // Preload background + all location sprites before drawing.
      // Sprite.from() on an unloaded texture returns a 1×1 placeholder;
      // setting width/height on a 1×1 calculates a wildly wrong scale factor.
      const allUrls = [
        "/assets/map/world-map-bg.png",
        ...locations.map((l) => l.spriteUrl),
      ]
      await Promise.all(allUrls.map((url) => Assets.load(url).catch(() => null)))
      if (cancelled) return

      // Background image — preload with Assets.load so the texture has real dimensions
      // before we set width/height. Sprite.from() on an unloaded texture returns a 1x1
      // placeholder, causing the scale calculation to be wildly wrong.
      await Assets.load("/assets/map/world-map-bg.png").catch(() => null)
      if (cancelled) return
      const bg = Sprite.from("/assets/map/world-map-bg.png")
      bg.width  = MAP_WIDTH
      bg.height = MAP_HEIGHT
      app.stage.addChild(bg)

      // ── Scroll state ──────────────────────────────────────────────────────────
      const minY  = -(MAP_HEIGHT * scale - canvasH)
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

      // ── Entrance animation (first visit — zoom out from current location) ─────
      if (isFirstVisit) {
        const currentLoc = locations.find((l) => l.moduleId === currentModuleId)
        if (currentLoc) {
          const startScale = scale * 1.5
          const targetY    = scrollY
          app.stage.scale.set(startScale)
          app.stage.y = clamp(-(currentLoc.y * startScale - canvasH / 2))

          const DURATION = 1200
          let elapsed    = 0
          const entranceTick = (ticker: Ticker) => {
            elapsed += ticker.deltaMS
            const p     = Math.min(elapsed / DURATION, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            app!.stage.scale.set(startScale - scale * 0.5 * eased)
            app!.stage.y = clamp(
              (startScale - scale * 0.5 * eased) *
                (-currentLoc.y + canvasH / 2 / startScale) * eased +
                (1 - eased) * clamp(-(currentLoc.y * startScale - canvasH / 2)) +
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
      function onTouchStart(e: TouchEvent) { touchStartY = e.touches[0].clientY }
      function onTouchMove(e: TouchEvent) {
        const dy  = e.touches[0].clientY - touchStartY
        touchStartY = e.touches[0].clientY
        scrollY = clamp(app!.stage.y + dy)
        app!.stage.y = scrollY
        sessionStorage.setItem(SCROLL_KEY, String(scrollY))
      }
      ;(app.canvas as HTMLCanvasElement).addEventListener("touchstart", onTouchStart)
      ;(app.canvas as HTMLCanvasElement).addEventListener("touchmove",  onTouchMove)
      cleanupHandlers.push(() => {
        ;(app!.canvas as HTMLCanvasElement).removeEventListener("touchstart", onTouchStart)
        ;(app!.canvas as HTMLCanvasElement).removeEventListener("touchmove",  onTouchMove)
      })

      // ── Location markers ──────────────────────────────────────────────────────
      for (const location of locations) {
        const mod = modules.find((m) => m.id === location.moduleId)
        if (!mod) continue

        const isLocked    = !mod.is_unlocked
        const isCompleted = mod.quiz_score_achieved !== null
        const isActive    = mod.is_unlocked && !isCompleted

        // Active badge is intentionally largest to guide the user's eye
        const badgeSize   = isActive ? 88 : isCompleted ? 80 : 70
        const borderColor = isLocked    ? 0x3d3d50   // dark stone grey
                          : isCompleted ? 0xb8750a   // deep amber gold
                          :               0xffd43b   // bright gold
        const innerColor  = isLocked    ? 0x1c1c2e
                          : isCompleted ? 0x1e1200
                          :               0x0c1a35

        // Container groups badge + sprite so scale pulse moves them together
        const marker = new Container()
        marker.x = location.x
        marker.y = location.y

        const badgeGraphic = new Graphics()
        drawOctBadge(badgeGraphic, badgeSize, borderColor, innerColor)
        marker.addChild(badgeGraphic)

        // Sprite fills the inner region of the badge
        const spriteSize = badgeSize - 22
        const sprite     = Sprite.from(location.spriteUrl)
        sprite.width     = spriteSize
        sprite.height    = spriteSize
        sprite.anchor.set(0.5)
        if (isLocked) {
          const grey = new ColorMatrixFilter()
          grey.desaturate()
          sprite.filters = [grey]
          sprite.alpha   = 0.4
        }
        marker.addChild(sprite)

        // Completed: pixel crown peeking above the top badge edge
        if (isCompleted) {
          const crown = new Graphics()
          drawPixelCrown(crown, 0xffd43b)
          crown.x = badgeSize * 0.28
          crown.y = -badgeSize * 0.42
          marker.addChild(crown)
        }

        marker.eventMode = "static"
        marker.cursor    = "pointer"
        marker.on("pointertap", () => {
          if (navigator.vibrate) navigator.vibrate(10)
          onLocationTap(location.moduleId)
        })
        app.stage.addChild(marker)

        // Active: bouncing chevron above + scale pulse on the whole badge
        if (isActive) {
          const indicator = new Graphics()
          drawActiveIndicator(indicator, 0xffd43b)
          indicator.x = location.x
          app.stage.addChild(indicator)

          const baseY = location.y - badgeSize * 0.72
          let t = 0
          const animTick = (ticker: Ticker) => {
            t += ticker.deltaTime * 0.045
            // Scale pulse is more dimensional than alpha-only pulsing
            marker.scale.set(1 + Math.sin(t) * 0.04)
            // Chevron bounces toward the badge and springs back up
            indicator.y = baseY + Math.abs(Math.sin(t * 0.9)) * 6
          }
          app.ticker.add(animTick)
        }

        // Biome ambient particles rendered above the marker
        addBiomeParticles(app, location.particleType, location.x, location.y)
      }

      // ── Test hook ─────────────────────────────────────────────────────────────
      // Exposes window.__zenkaiTapModule for Playwright E2E tests
      if (process.env.NODE_ENV !== "production") {
        ;(window as Window & { __zenkaiTapModule?: (id: number) => void })
          .__zenkaiTapModule = (moduleId: number) => {
          if (navigator.vibrate) navigator.vibrate(10)
          onLocationTap(moduleId)
        }
      }
    }

    init().catch((err: unknown) => {
      console.error("[PixiMapCanvas] init failed:", err)
    })

    return () => {
      cancelled = true
      cleanupHandlers.forEach((fn) => fn())
      // Only destroy if init completed — avoids "this._cancelResize is not a function"
      // when React Strict Mode runs cleanup before app.init() resolves
      if (app && initialized) app.destroy()
    }
  }, [locations, modules, currentModuleId, onLocationTap, headerHeight])

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", top: headerHeight, left: 0, right: 0, bottom: 0 }}
    />
  )
}
