import { Container, Graphics, type Application } from "pixi.js"
import type { ParticleType } from "@/lib/worldMapConfig"

interface ParticleCfg {
  color: number
  count: number
  speedY: number
  speedX: number
  sizeMin: number
  sizeMax: number
  alpha: number
}

const CFG: Record<ParticleType, ParticleCfg> = {
  sakura:  { color: 0xFFB7C5, count: 18, speedY: 0.4,   speedX: 0.3,  sizeMin: 3,  sizeMax: 6,  alpha: 0.7  },
  firefly: { color: 0xFFFF88, count: 12, speedY: -0.1,  speedX: 0.15, sizeMin: 2,  sizeMax: 3,  alpha: 0.8  },
  mist:    { color: 0xCCCCCC, count: 10, speedY: -0.05, speedX: 0.08, sizeMin: 8,  sizeMax: 16, alpha: 0.15 },
  sparks:  { color: 0xFFAA00, count: 14, speedY: -0.6,  speedX: 0.4,  sizeMin: 2,  sizeMax: 4,  alpha: 0.9  },
  ash:     { color: 0x888888, count: 16, speedY: -0.3,  speedX: 0.2,  sizeMin: 2,  sizeMax: 5,  alpha: 0.5  },
  snow:    { color: 0xEEEEFF, count: 20, speedY: 0.5,   speedX: 0.1,  sizeMin: 2,  sizeMax: 4,  alpha: 0.8  },
  sand:    { color: 0xD4A017, count: 12, speedY: 0.2,   speedX: 0.5,  sizeMin: 1,  sizeMax: 3,  alpha: 0.4  },
  rain:    { color: 0x6699CC, count: 24, speedY: 1.2,   speedX: 0.3,  sizeMin: 1,  sizeMax: 2,  alpha: 0.5  },
  cloud:   { color: 0xFFFFFF, count: 8,  speedY: -0.08, speedX: 0.06, sizeMin: 10, sizeMax: 20, alpha: 0.12 },
}

export function addBiomeParticles(
  app: Application,
  particleType: ParticleType,
  centerX: number,
  centerY: number,
  radiusX = 120,
  radiusY = 80,
): void {
  const cfg = CFG[particleType]
  const container = new Container()
  container.x = centerX
  container.y = centerY

  const particles: Array<{ g: Graphics; vx: number; vy: number }> = []

  for (let i = 0; i < cfg.count; i++) {
    const g = new Graphics()
    const size = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin)
    g.circle(0, 0, size).fill({ color: cfg.color, alpha: cfg.alpha })
    g.x = (Math.random() - 0.5) * radiusX * 2
    g.y = (Math.random() - 0.5) * radiusY * 2
    container.addChild(g)
    particles.push({
      g,
      vx: (Math.random() - 0.5) * cfg.speedX * 2,
      vy: cfg.speedY + (Math.random() - 0.5) * 0.2,
    })
  }

  app.stage.addChild(container)

  app.ticker.add(() => {
    for (const p of particles) {
      p.g.x += p.vx
      p.g.y += p.vy
      if (p.g.y > radiusY)  p.g.y = -radiusY
      if (p.g.y < -radiusY) p.g.y = radiusY
      if (p.g.x > radiusX)  p.g.x = -radiusX
      if (p.g.x < -radiusX) p.g.x = radiusX
    }
  })
}
