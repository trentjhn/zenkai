import { Container, Graphics, type Application } from "pixi.js"
import type { ParticleType } from "@/lib/worldMapConfig"

interface Particle {
  g: Graphics
  vx: number
  vy: number
  blinkTimer?: number  // firefly only
  baseAlpha?: number   // firefly only
}

// Spawn a single particle at a random position within the local AABB.
// Each biome type gets its own shape and respawn logic in the tick closure.
export function addBiomeParticles(
  app: Application,
  particleType: ParticleType,
  centerX: number,
  centerY: number,
  radiusX = 120,
  radiusY = 90,
): void {
  const container = new Container()
  container.x = centerX
  container.y = centerY
  app.stage.addChild(container)

  const particles: Particle[] = []

  // ── Per-biome factory ──────────────────────────────────────────────────────
  function makeParticle(preplace: boolean): Particle {
    const g = new Graphics()

    switch (particleType) {
      // Sakura petals — small squares, gentle diagonal drift downward
      case "sakura": {
        const s = 2 + Math.floor(Math.random() * 2) // 2 or 3 px
        g.rect(-s / 2, -s / 2, s, s).fill({ color: 0xFFB7C5, alpha: 0.75 })
        g.x = (Math.random() - 0.5) * radiusX * 2
        g.y = preplace ? (Math.random() - 0.5) * radiusY * 2 : -radiusY
        return { g, vx: (Math.random() - 0.5) * 0.4, vy: 0.35 + Math.random() * 0.2 }
      }

      // Fireflies — tiny circles that blink on/off
      case "firefly": {
        g.circle(0, 0, 1.5).fill({ color: 0xFFFF88, alpha: 0.9 })
        g.x = (Math.random() - 0.5) * radiusX * 2
        g.y = (Math.random() - 0.5) * radiusY * 2
        const baseAlpha = 0.6 + Math.random() * 0.4
        return {
          g,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.1,
          blinkTimer: Math.random() * 180,
          baseAlpha,
        }
      }

      // Mist — large soft squares that drift slowly sideways
      case "mist": {
        const s = 10 + Math.floor(Math.random() * 10)
        g.rect(-s / 2, -s / 2, s, s).fill({ color: 0xCCDDEE, alpha: 0.1 })
        g.x = (Math.random() - 0.5) * radiusX * 2
        g.y = (Math.random() - 0.5) * radiusY * 2
        return { g, vx: 0.06 + Math.random() * 0.06, vy: 0 }
      }

      // Sparks — tiny squares, rise upward fast, random x jitter
      case "sparks": {
        const s = 2
        g.rect(-s / 2, -s / 2, s, s).fill({ color: 0xFFAA00, alpha: 0.9 })
        g.x = (Math.random() - 0.5) * radiusX * 0.6
        g.y = preplace ? (Math.random() - 0.5) * radiusY * 2 : radiusY
        return { g, vx: (Math.random() - 0.5) * 0.5, vy: -(0.5 + Math.random() * 0.4) }
      }

      // Ash — small squares, drift upward slowly with side sway
      case "ash": {
        const s = 2 + Math.floor(Math.random() * 2)
        g.rect(-s / 2, -s / 2, s, s).fill({ color: 0x888888, alpha: 0.45 })
        g.x = (Math.random() - 0.5) * radiusX * 2
        g.y = preplace ? (Math.random() - 0.5) * radiusY * 2 : radiusY
        return { g, vx: (Math.random() - 0.5) * 0.25, vy: -(0.25 + Math.random() * 0.15) }
      }

      // Snow — small squares, fall straight down with slight drift
      case "snow": {
        const s = 2
        g.rect(-s / 2, -s / 2, s, s).fill({ color: 0xEEEEFF, alpha: 0.8 })
        g.x = (Math.random() - 0.5) * radiusX * 2
        g.y = preplace ? (Math.random() - 0.5) * radiusY * 2 : -radiusY
        return { g, vx: (Math.random() - 0.5) * 0.15, vy: 0.45 + Math.random() * 0.15 }
      }

      // Sand — tiny single pixels, blow sideways + slight fall
      case "sand": {
        g.rect(0, 0, 1, 1).fill({ color: 0xD4A017, alpha: 0.4 })
        g.x = (Math.random() - 0.5) * radiusX * 2
        g.y = (Math.random() - 0.5) * radiusY * 2
        return { g, vx: 0.4 + Math.random() * 0.3, vy: 0.1 + Math.random() * 0.1 }
      }

      // Rain — tall thin rectangles, fall steeply at an angle
      case "rain": {
        g.rect(-1, -4, 2, 8).fill({ color: 0x6699CC, alpha: 0.5 })
        g.x = (Math.random() - 0.5) * radiusX * 2
        g.y = preplace ? (Math.random() - 0.5) * radiusY * 2 : -radiusY
        return { g, vx: 0.3, vy: 1.2 + Math.random() * 0.4 }
      }

      // Cloud wisps — wide flat rectangles, drift sideways, wrap
      case "cloud": {
        const w = 14 + Math.floor(Math.random() * 12)
        g.rect(-w / 2, -3, w, 6).fill({ color: 0xFFFFFF, alpha: 0.08 })
        g.x = (Math.random() - 0.5) * radiusX * 2
        g.y = (Math.random() - 0.5) * radiusY * 2
        return { g, vx: 0.05 + Math.random() * 0.05, vy: 0 }
      }
    }
  }

  const COUNT: Record<ParticleType, number> = {
    sakura: 16, firefly: 10, mist: 8, sparks: 12,
    ash: 14, snow: 18, sand: 10, rain: 22, cloud: 6,
  }

  for (let i = 0; i < COUNT[particleType]; i++) {
    const p = makeParticle(true)
    container.addChild(p.g)
    particles.push(p)
  }

  // ── Tick ──────────────────────────────────────────────────────────────────
  app.ticker.add(() => {
    for (const p of particles) {
      p.g.x += p.vx
      p.g.y += p.vy

      // Firefly blink
      if (particleType === "firefly" && p.blinkTimer !== undefined) {
        p.blinkTimer++
        // Full blink cycle ~200 frames; visible for ~140, dim for ~60
        const cycle = p.blinkTimer % 200
        const alpha = cycle < 140
          ? (p.baseAlpha ?? 0.8)
          : (p.baseAlpha ?? 0.8) * (1 - (cycle - 140) / 60)
        p.g.alpha = alpha
      }

      // Respawn logic: downward particles respawn above, upward below, sideways wrap
      switch (particleType) {
        case "sakura":
        case "snow":
        case "rain":
          if (p.g.y > radiusY) {
            p.g.y = -radiusY
            p.g.x = (Math.random() - 0.5) * radiusX * 2
          }
          // Sideways drift wrap
          if (p.g.x > radiusX)  p.g.x = -radiusX
          if (p.g.x < -radiusX) p.g.x = radiusX
          break

        case "sparks":
        case "ash":
          if (p.g.y < -radiusY) {
            p.g.y = radiusY
            p.g.x = (Math.random() - 0.5) * radiusX * 0.6
          }
          if (p.g.x > radiusX)  p.g.x = -radiusX
          if (p.g.x < -radiusX) p.g.x = radiusX
          break

        case "sand":
        case "mist":
        case "cloud":
          // Horizontal drift: wrap sides, keep y bouncing
          if (p.g.x > radiusX)  p.g.x = -radiusX
          if (p.g.x < -radiusX) p.g.x = radiusX
          if (p.g.y > radiusY)  p.g.y = -radiusY
          if (p.g.y < -radiusY) p.g.y = radiusY
          break

        case "firefly":
          // Soft bounce at boundaries to keep fireflies in zone
          if (p.g.x > radiusX)  { p.g.x = radiusX;  p.vx = -Math.abs(p.vx) }
          if (p.g.x < -radiusX) { p.g.x = -radiusX; p.vx =  Math.abs(p.vx) }
          if (p.g.y > radiusY)  { p.g.y = radiusY;  p.vy = -Math.abs(p.vy) }
          if (p.g.y < -radiusY) { p.g.y = -radiusY; p.vy =  Math.abs(p.vy) }
          break
      }
    }
  })
}
