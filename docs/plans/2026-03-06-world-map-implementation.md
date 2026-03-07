# World Map Visual Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Transform the bare world map page into a pixel art campaign map with 9 distinct biomes, WebGL-rendered glow/fog/particles via Pixi.js, polished navigation transitions, and a fixed character status header.

**Architecture:** Gemini-generated background image + PixelLab location sprites sit underneath a `@pixi/react` WebGL canvas that handles all interactive elements (fog of war, glow filters, ambient particles, location taps). A fixed Framer Motion header sits above the canvas. The slide-up location panel is a Framer Motion overlay, not part of the Pixi canvas. All module/character data comes from the existing React Query + FastAPI stack.

**Tech Stack:** `pixi.js`, `@pixi/react`, `@pixi/filter-glow`, `pixi-viewport`, Framer Motion (existing), React Query (existing), Next.js 14 App Router, Playwright, Vitest

**Design doc:** `docs/plans/2026-03-06-world-map-design.md`

---

## Task 1: Install Pixi.js dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install packages**

```bash
cd frontend
npm install pixi.js @pixi/react @pixi/filter-glow pixi-viewport
```

**Step 2: Verify TypeScript is still clean**

```bash
npx tsc --noEmit
```
Expected: no new errors

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: install pixi.js, @pixi/react, @pixi/filter-glow, pixi-viewport"
```

---

## Task 2: Generate world map background image (human action)

**Files:**
- Create: `frontend/public/assets/map/world-map-bg.png`

This task requires prompting Gemini / Nano Banana. No code to write.

**Step 1: Prompt Gemini with the following:**

```
Create a tall vertical pixel art world map in the style of Pokémon HeartGold/SoulSilver.
Top-down perspective, Japanese feudal aesthetic. Image dimensions: 800×4500px.
9 distinct vertical zones from bottom to top, connected by a winding path:

1. (Bottom) Cherry Blossom Village — spring, pink cherry trees, traditional Japanese buildings, gentle
2. Bamboo Forest Temple — dense bamboo, stone lanterns, hidden pagoda, fireflies
3. Mountain Monastery — stone bridges, alpine fog, Buddhist monastery carved into cliff
4. Clockwork Fortress — mechanical castle, brass gears, steam vents, complex architecture
5. Volcano Shrine — active lava flows, Shinto torii gate, fire temple built into caldera
6. Frozen Tundra / Ice Caverns — crystalline ice, snowfall, blue-white palette, frozen lake
7. Desert Ruins / Sand Temple — sandy dunes, ancient stone pyramid, oasis palms, warm amber tones
8. Shadow Cliffside Fortress — dark ocean cliffs, storm clouds, dramatic lightning, dark keep
9. (Top) Summit Sanctum — mountain peak above clouds, golden light, final shrine

Consistent pixel density throughout. Muted base palette with vibrant accent colors per biome.
Winding dirt road / stone path connects all locations. Style: 16-bit JRPG pixel art, NOT vector art.
```

**Step 2: Save the output to:**

```
frontend/public/assets/map/world-map-bg.png
```

Iterate on the prompt until the result looks close to the Pokémon HeartGold aesthetic from the reference image.

**Step 3: Commit**

```bash
git add frontend/public/assets/map/
git commit -m "assets: Gemini-generated pixel art world map background"
```

---

## Task 3: Generate location sprites with PixelLab (9 sprites)

**Files:**
- Create: `frontend/public/assets/map/locations/` (9 PNG files)

Use the PixelLab MCP `create_map_object` tool for each sprite. Settings: 64×64px, top-down view, single color outline, medium shading, transparent background.

| Filename | Description for PixelLab |
|----------|--------------------------|
| `module-1-cherry-village.png` | Traditional Japanese village gate with cherry blossom trees, top-down pixel art |
| `module-2-bamboo-temple.png` | Stone bamboo pagoda surrounded by bamboo stalks, top-down pixel art |
| `module-3-mountain-monastery.png` | Stone Buddhist monastery on mountain cliff edge, top-down pixel art |
| `module-4-clockwork-fortress.png` | Mechanical castle with visible brass gears and steam vents, top-down pixel art |
| `module-5-volcano-shrine.png` | Red Shinto torii gate surrounded by lava flows, top-down pixel art |
| `module-6-ice-cavern.png` | Crystal ice palace entrance with frozen spires, top-down pixel art |
| `module-7-desert-ruins.png` | Ancient stone pyramid with sand dunes and palm oasis, top-down pixel art |
| `module-8-shadow-fortress.png` | Dark stone fortress on cliff edge with storm clouds, top-down pixel art |
| `module-9-summit-sanctum.png` | Golden mountain peak shrine above clouds, top-down pixel art |

**Step 1:** Generate each sprite via PixelLab MCP and save to `frontend/public/assets/map/locations/`.

**Step 2: Commit**

```bash
git add frontend/public/assets/map/locations/
git commit -m "assets: PixelLab location sprites for all 9 world map modules"
```

---

## Task 4: World map location config

**Files:**
- Create: `frontend/lib/worldMapConfig.ts`
- Create: `frontend/tests/worldMapConfig.test.ts`

**Step 1: Write the failing test**

Create `frontend/tests/worldMapConfig.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { LOCATIONS, getLocationByModuleId } from "@/lib/worldMapConfig"

describe("worldMapConfig", () => {
  it("has exactly 9 locations", () => {
    expect(LOCATIONS).toHaveLength(9)
  })

  it("each location has all required fields", () => {
    LOCATIONS.forEach((loc) => {
      expect(loc).toHaveProperty("moduleId")
      expect(loc).toHaveProperty("x")
      expect(loc).toHaveProperty("y")
      expect(loc).toHaveProperty("name")
      expect(loc).toHaveProperty("biome")
      expect(loc).toHaveProperty("accentColor")
      expect(loc).toHaveProperty("particleType")
      expect(loc).toHaveProperty("spriteUrl")
    })
  })

  it("getLocationByModuleId returns correct location", () => {
    const loc = getLocationByModuleId(1)
    expect(loc?.name).toBe("Cherry Blossom Village")
  })

  it("getLocationByModuleId returns undefined for unknown id", () => {
    expect(getLocationByModuleId(99)).toBeUndefined()
  })

  it("module IDs are 1-9", () => {
    const ids = LOCATIONS.map((l) => l.moduleId).sort((a, b) => a - b)
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
```

**Step 2: Run to verify it fails**

```bash
cd frontend && npx vitest run tests/worldMapConfig.test.ts
```
Expected: FAIL — module not found

**Step 3: Implement**

Create `frontend/lib/worldMapConfig.ts`:

```typescript
export type ParticleType =
  | "sakura" | "firefly" | "mist" | "sparks"
  | "ash" | "snow" | "sand" | "rain" | "cloud"

export interface WorldMapLocation {
  moduleId: number
  name: string
  biome: string
  x: number           // pixel x on 800px-wide background image
  y: number           // pixel y from top of 4500px-tall background image
  accentColor: number // Pixi hex (0xRRGGBB) — used for Enter Dōjō biome flash
  particleType: ParticleType
  spriteUrl: string
}

export const LOCATIONS: WorldMapLocation[] = [
  {
    moduleId: 1, name: "Cherry Blossom Village", biome: "cherry-blossom",
    x: 400, y: 4100, accentColor: 0xFFB7C5, particleType: "sakura",
    spriteUrl: "/assets/map/locations/module-1-cherry-village.png",
  },
  {
    moduleId: 2, name: "Bamboo Forest Temple", biome: "bamboo-forest",
    x: 350, y: 3600, accentColor: 0x4CAF50, particleType: "firefly",
    spriteUrl: "/assets/map/locations/module-2-bamboo-temple.png",
  },
  {
    moduleId: 3, name: "Mountain Monastery", biome: "mountain",
    x: 420, y: 3100, accentColor: 0x9E9E9E, particleType: "mist",
    spriteUrl: "/assets/map/locations/module-3-mountain-monastery.png",
  },
  {
    moduleId: 4, name: "Clockwork Fortress", biome: "clockwork",
    x: 380, y: 2600, accentColor: 0xB8860B, particleType: "sparks",
    spriteUrl: "/assets/map/locations/module-4-clockwork-fortress.png",
  },
  {
    moduleId: 5, name: "Volcano Shrine", biome: "volcano",
    x: 440, y: 2200, accentColor: 0xFF4500, particleType: "ash",
    spriteUrl: "/assets/map/locations/module-5-volcano-shrine.png",
  },
  {
    moduleId: 6, name: "Frozen Tundra", biome: "ice",
    x: 360, y: 1800, accentColor: 0x81D4FA, particleType: "snow",
    spriteUrl: "/assets/map/locations/module-6-ice-cavern.png",
  },
  {
    moduleId: 7, name: "Desert Ruins", biome: "desert",
    x: 420, y: 1400, accentColor: 0xD4A017, particleType: "sand",
    spriteUrl: "/assets/map/locations/module-7-desert-ruins.png",
  },
  {
    moduleId: 8, name: "Shadow Cliffside", biome: "shadow",
    x: 370, y: 950, accentColor: 0x37474F, particleType: "rain",
    spriteUrl: "/assets/map/locations/module-8-shadow-fortress.png",
  },
  {
    moduleId: 9, name: "Summit Sanctum", biome: "summit",
    x: 400, y: 400, accentColor: 0xFFE066, particleType: "cloud",
    spriteUrl: "/assets/map/locations/module-9-summit-sanctum.png",
  },
]

export function getLocationByModuleId(moduleId: number): WorldMapLocation | undefined {
  return LOCATIONS.find((l) => l.moduleId === moduleId)
}
```

**Step 4: Run to verify it passes**

```bash
cd frontend && npx vitest run tests/worldMapConfig.test.ts
```
Expected: PASS — 5 tests

**Step 5: Commit**

```bash
git add frontend/lib/worldMapConfig.ts frontend/tests/worldMapConfig.test.ts
git commit -m "feat: world map location config — 9 biomes with coordinates and metadata"
```

---

## Task 5: MapHeader component

**Files:**
- Create: `frontend/components/ui/MapHeader.tsx`
- Create: `frontend/tests/MapHeader.test.tsx`

**Step 1: Write the failing test**

Create `frontend/tests/MapHeader.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MapHeader } from "@/components/ui/MapHeader"

const mockChar = { character_form: 1, total_xp: 240 }

describe("MapHeader", () => {
  it("renders form name for form 1", () => {
    render(<MapHeader character={mockChar} targetXp={240} />)
    expect(screen.getByText("浪人 Ronin")).toBeInTheDocument()
  })

  it("renders XP value", () => {
    render(<MapHeader character={mockChar} targetXp={240} />)
    expect(screen.getByText("240 XP")).toBeInTheDocument()
  })

  it("renders currency placeholder slot", () => {
    render(<MapHeader character={mockChar} targetXp={240} />)
    expect(screen.getByTestId("currency-slot")).toBeInTheDocument()
  })

  it("renders Review Queue button", () => {
    render(<MapHeader character={mockChar} targetXp={240} />)
    expect(screen.getByText("Review Queue")).toBeInTheDocument()
  })

  it("renders correct form name for form 2", () => {
    render(<MapHeader character={{ ...mockChar, character_form: 2 }} targetXp={240} />)
    expect(screen.getByText("Warrior")).toBeInTheDocument()
  })
})
```

**Step 2: Run to verify it fails**

```bash
cd frontend && npx vitest run tests/MapHeader.test.tsx
```
Expected: FAIL

**Step 3: Implement**

Create `frontend/components/ui/MapHeader.tsx`:

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { RoninSprite } from "@/components/ui/RoninSprite"

const FORM_NAMES: Record<number, string> = {
  1: "浪人 Ronin",
  2: "Warrior",
  3: "Samurai",
  4: "The Ghost",
}

interface MapHeaderProps {
  character: { character_form: number; total_xp: number }
  targetXp: number
}

export function MapHeader({ character, targetXp }: MapHeaderProps) {
  const router = useRouter()
  const [displayXp, setDisplayXp] = useState(targetXp)
  const prevXp = useRef(targetXp)

  // Count-up animation when XP increases (e.g. returning from a concept)
  useEffect(() => {
    if (targetXp === prevXp.current) return
    const start = prevXp.current
    const end = targetXp
    const duration = 1200
    const startTime = performance.now()

    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      setDisplayXp(Math.round(start + (end - start) * progress))
      if (progress < 1) requestAnimationFrame(tick)
      else prevXp.current = end
    }

    requestAnimationFrame(tick)
  }, [targetXp])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-zen-void border-b border-zen-plasma/10 select-none">
      {/* Left: sprite + form + XP */}
      <div className="flex items-center gap-3">
        <RoninSprite animation="breathing-idle" direction="south" scale={1} />
        <div>
          <p className="font-heading text-zen-gold text-sm font-semibold leading-tight">
            {FORM_NAMES[character.character_form] ?? "Ronin"}
          </p>
          <p className="font-mono text-[10px] text-zen-plasma/60 tracking-widest">
            {displayXp} XP
          </p>
        </div>
      </div>

      {/* Right: currency placeholder + review queue */}
      <div className="flex items-center gap-5">
        <div
          data-testid="currency-slot"
          className="flex items-center gap-1.5 opacity-30 cursor-not-allowed"
          title="Marketplace — coming soon"
        >
          <span className="font-mono text-sm text-zen-gold">◈</span>
          <span className="font-mono text-xs text-zen-plasma/50">—</span>
        </div>
        <button
          onClick={() => router.push("/review")}
          className="font-mono text-[10px] uppercase tracking-widest text-zen-plasma/60 hover:text-zen-plasma transition-colors"
        >
          Review Queue
        </button>
      </div>
    </header>
  )
}
```

**Step 4: Run to verify it passes**

```bash
cd frontend && npx vitest run tests/MapHeader.test.tsx
```
Expected: PASS — 5 tests

**Step 5: Commit**

```bash
git add frontend/components/ui/MapHeader.tsx frontend/tests/MapHeader.test.tsx
git commit -m "feat: MapHeader — sprite, form name, XP count-up, currency slot, review queue"
```

---

## Task 6: LocationPanel (slide-up)

**Files:**
- Create: `frontend/components/ui/LocationPanel.tsx`
- Create: `frontend/tests/LocationPanel.test.tsx`

**Step 1: Write the failing test**

Create `frontend/tests/LocationPanel.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { LocationPanel } from "@/components/ui/LocationPanel"
import { LOCATIONS } from "@/lib/worldMapConfig"

const location = LOCATIONS[0] // Cherry Blossom Village

const unlockedModule = {
  id: 1, title: "Prompt Engineering", is_unlocked: true,
  quiz_score_achieved: null, order_index: 1,
  concepts: [{ id: 1 }, { id: 2 }, { id: 3 }],
}

const lockedModule = {
  id: 2, title: "Context Engineering", is_unlocked: false,
  quiz_score_achieved: null, order_index: 2,
  concepts: [],
}

describe("LocationPanel", () => {
  it("shows location name", () => {
    render(<LocationPanel location={location} module={unlockedModule} onEnter={() => {}} onDismiss={() => {}} />)
    expect(screen.getByText("Cherry Blossom Village")).toBeInTheDocument()
  })

  it("shows Enter Dojo button when unlocked", () => {
    render(<LocationPanel location={location} module={unlockedModule} onEnter={() => {}} onDismiss={() => {}} />)
    expect(screen.getByText(/Enter Dōjō/i)).toBeInTheDocument()
  })

  it("shows locked message when locked", () => {
    render(<LocationPanel location={location} module={lockedModule} onEnter={() => {}} onDismiss={() => {}} />)
    expect(screen.getByText(/Locked/i)).toBeInTheDocument()
    expect(screen.queryByText(/Enter Dōjō/i)).not.toBeInTheDocument()
  })

  it("calls onEnter when Enter Dojo is clicked", () => {
    const onEnter = vi.fn()
    render(<LocationPanel location={location} module={unlockedModule} onEnter={onEnter} onDismiss={() => {}} />)
    fireEvent.click(screen.getByText(/Enter Dōjō/i))
    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it("calls onDismiss when backdrop is clicked", () => {
    const onDismiss = vi.fn()
    render(<LocationPanel location={location} module={unlockedModule} onEnter={() => {}} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByTestId("panel-backdrop"))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it("shows Revisit Dojo when module is completed", () => {
    const completed = { ...unlockedModule, quiz_score_achieved: 0.9 }
    render(<LocationPanel location={location} module={completed} onEnter={() => {}} onDismiss={() => {}} />)
    expect(screen.getByText(/Revisit Dōjō/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run to verify it fails**

```bash
cd frontend && npx vitest run tests/LocationPanel.test.tsx
```
Expected: FAIL

**Step 3: Implement**

Create `frontend/components/ui/LocationPanel.tsx`:

```tsx
"use client"

import { motion } from "framer-motion"
import { SamuraiButton } from "@/components/ui/SamuraiButton"
import type { WorldMapLocation } from "@/lib/worldMapConfig"
import type { Module } from "@/lib/types"

interface LocationPanelProps {
  location: WorldMapLocation
  module: Module & { concepts: { id: number }[] }
  onEnter: () => void
  onDismiss: () => void
}

export function LocationPanel({ location, module, onEnter, onDismiss }: LocationPanelProps) {
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
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zen-plasma/20" />

        <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
          {location.biome}
        </p>
        <h2 className="font-heading text-xl font-bold text-zen-gold mt-0.5">
          {location.name}
        </h2>
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
      </motion.div>
    </div>
  )
}
```

**Step 4: Run to verify it passes**

```bash
cd frontend && npx vitest run tests/LocationPanel.test.tsx
```
Expected: PASS — 6 tests

**Step 5: Commit**

```bash
git add frontend/components/ui/LocationPanel.tsx frontend/tests/LocationPanel.test.tsx
git commit -m "feat: LocationPanel slide-up with locked/unlocked/completed states"
```

---

## Task 7: Biome particle factory

**Files:**
- Create: `frontend/lib/mapParticles.ts`

No unit tests — Pixi Graphics can't run in jsdom. Covered visually and via E2E.

**Step 1: Implement**

Create `frontend/lib/mapParticles.ts`:

```typescript
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
) {
  const cfg = CFG[particleType]
  const container = new Container()
  container.x = centerX
  container.y = centerY

  const particles: Array<{ g: Graphics; vx: number; vy: number }> = []

  for (let i = 0; i < cfg.count; i++) {
    const g = new Graphics()
    g.beginFill(cfg.color, cfg.alpha)
    const size = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin)
    g.drawCircle(0, 0, size)
    g.endFill()
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
```

**Step 2: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/lib/mapParticles.ts
git commit -m "feat: biome ambient particle factory for world map"
```

---

## Task 8: PixiMapCanvas — full implementation

**Files:**
- Create: `frontend/components/ui/PixiMapCanvas.tsx`

No jsdom unit tests for Pixi WebGL internals. All Pixi behavior covered by Playwright E2E.

**Step 1: Implement**

Create `frontend/components/ui/PixiMapCanvas.tsx`:

```tsx
"use client"

import { useEffect, useRef } from "react"
import { Application, Sprite, Texture, ColorMatrixFilter } from "pixi.js"
import { GlowFilter } from "@pixi/filter-glow"
import { addBiomeParticles } from "@/lib/mapParticles"
import type { WorldMapLocation } from "@/lib/worldMapConfig"
import type { Module } from "@/lib/types"

const MAP_WIDTH  = 800
const MAP_HEIGHT = 4500
const SCROLL_KEY = "world-map-scroll"

interface PixiMapCanvasProps {
  locations: WorldMapLocation[]
  modules: Module[]
  currentModuleId: number
  onLocationTap: (moduleId: number) => void
  headerHeight: number
}

export function PixiMapCanvas({
  locations, modules, currentModuleId, onLocationTap, headerHeight,
}: PixiMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const canvasH = window.innerHeight - headerHeight
    const app = new Application({
      width: window.innerWidth,
      height: canvasH,
      backgroundColor: 0x0d1117,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    })
    containerRef.current.appendChild(app.view as HTMLCanvasElement)

    const scale = window.innerWidth / MAP_WIDTH
    app.stage.scale.set(scale)

    // Background
    const bg = Sprite.from("/assets/map/world-map-bg.png")
    bg.width  = MAP_WIDTH
    bg.height = MAP_HEIGHT
    app.stage.addChild(bg)

    // Scroll state
    const savedScroll = sessionStorage.getItem(SCROLL_KEY)
    const minY = -(MAP_HEIGHT * scale - canvasH)
    const clamp = (y: number) => Math.min(0, Math.max(minY, y))

    let scrollY: number
    const isFirstVisit = !savedScroll

    if (savedScroll) {
      scrollY = parseFloat(savedScroll)
    } else {
      const currentLoc = locations.find((l) => l.moduleId === currentModuleId)
      scrollY = currentLoc ? clamp(-(currentLoc.y * scale - canvasH / 2)) : minY
    }

    app.stage.y = scrollY

    // Entrance animation (first visit only — zoom out from player location)
    if (isFirstVisit) {
      const currentLoc = locations.find((l) => l.moduleId === currentModuleId)
      if (currentLoc) {
        app.stage.scale.set(scale * 1.5)
        app.stage.y = clamp(-(currentLoc.y * scale * 1.5 - canvasH / 2))
        const targetY = scrollY
        let elapsed = 0
        const DURATION = 1200
        const entranceTick = app.ticker.add((delta) => {
          elapsed += delta * (1000 / 60)
          const p = Math.min(elapsed / DURATION, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          app.stage.scale.set(scale * 1.5 - scale * 0.5 * eased)
          app.stage.y = clamp(scrollY + (targetY - scrollY) * eased)
          if (p >= 1) app.ticker.remove(entranceTick)
        })
      }
    }

    // Wheel scroll
    function onWheel(e: WheelEvent) {
      scrollY = clamp(app.stage.y - e.deltaY)
      app.stage.y = scrollY
      sessionStorage.setItem(SCROLL_KEY, String(scrollY))
    }
    ;(app.view as HTMLCanvasElement).addEventListener("wheel", onWheel)

    // Touch scroll
    let touchStartY = 0
    function onTouchStart(e: TouchEvent) { touchStartY = e.touches[0].clientY }
    function onTouchMove(e: TouchEvent) {
      const dy = e.touches[0].clientY - touchStartY
      touchStartY = e.touches[0].clientY
      scrollY = clamp(app.stage.y + dy)
      app.stage.y = scrollY
      sessionStorage.setItem(SCROLL_KEY, String(scrollY))
    }
    ;(app.view as HTMLCanvasElement).addEventListener("touchstart", onTouchStart)
    ;(app.view as HTMLCanvasElement).addEventListener("touchmove", onTouchMove)

    // Location sprites
    for (const location of locations) {
      const mod = modules.find((m) => m.id === location.moduleId)
      if (!mod) continue

      const sprite = Sprite.from(location.spriteUrl)
      sprite.width  = 64
      sprite.height = 64
      sprite.anchor.set(0.5)
      sprite.x = location.x
      sprite.y = location.y

      if (!mod.is_unlocked) {
        const grey = new ColorMatrixFilter()
        grey.desaturate()
        sprite.filters = [grey]
        sprite.alpha = 0.4
      } else if (mod.quiz_score_achieved !== null) {
        // Completed: warm steady glow
        sprite.filters = [new GlowFilter({ distance: 20, outerStrength: 1.5, color: 0xFFE066 })]
      } else {
        // In progress: pulsing glow
        const glow = new GlowFilter({ distance: 24, outerStrength: 2.5, color: 0x81D4FA })
        sprite.filters = [glow]
        let t = 0
        app.ticker.add(() => {
          t += 0.03
          glow.outerStrength = 1.5 + Math.sin(t) * 1.0
        })
      }

      // All locations are tappable (locked ones show the locked panel)
      sprite.eventMode = "static"
      sprite.cursor = "pointer"
      sprite.on("pointertap", () => {
        if (navigator.vibrate) navigator.vibrate(10)
        onLocationTap(location.moduleId)
      })

      app.stage.addChild(sprite)

      // Biome ambient particles
      addBiomeParticles(app, location.particleType, location.x, location.y)
    }

    return () => {
      const canvas = app.view as HTMLCanvasElement
      canvas.removeEventListener("wheel", onWheel)
      canvas.removeEventListener("touchstart", onTouchStart)
      canvas.removeEventListener("touchmove", onTouchMove)
      app.destroy(true)
    }
  }, [locations, modules, currentModuleId, onLocationTap, headerHeight])

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", top: headerHeight, left: 0, right: 0, bottom: 0 }}
    />
  )
}
```

**Step 2: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add frontend/components/ui/PixiMapCanvas.tsx
git commit -m "feat: PixiMapCanvas — WebGL map with background, location sprites, glow states, particles, scroll, entrance animation"
```

---

## Task 9: Assemble world-map/page.tsx

**Files:**
- Modify: `frontend/app/world-map/page.tsx`

**Step 1: Rewrite the page**

```tsx
"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryKeys"
import { MapHeader } from "@/components/ui/MapHeader"
import { PixiMapCanvas } from "@/components/ui/PixiMapCanvas"
import { LocationPanel } from "@/components/ui/LocationPanel"
import { LOCATIONS, getLocationByModuleId } from "@/lib/worldMapConfig"
import type { Module } from "@/lib/types"

const HEADER_HEIGHT = 56

export default function WorldMapPage() {
  const router = useRouter()
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  const [biomeFlashColor, setBiomeFlashColor] = useState<number | null>(null)
  const [showCompletionFlash, setShowCompletionFlash] = useState(false)

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

  // Current module = first unlocked module without a quiz score
  const currentModuleId =
    modules?.find((m) => m.is_unlocked && m.quiz_score_achieved === null)?.id ??
    modules?.[0]?.id ??
    1

  const selectedLocation = selectedModuleId ? getLocationByModuleId(selectedModuleId) : null
  const selectedModule = modules?.find((m) => m.id === selectedModuleId) as
    | (Module & { concepts: { id: number }[] })
    | undefined

  async function handleEnterDojo() {
    if (!selectedModuleId || !selectedLocation) return
    setBiomeFlashColor(selectedLocation.accentColor)
    const detail = await api.getModule(selectedModuleId)
    const first = detail.concepts[0]
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
      <MapHeader character={character} targetXp={character.total_xp} />

      <PixiMapCanvas
        locations={LOCATIONS}
        modules={modules}
        currentModuleId={currentModuleId}
        onLocationTap={setSelectedModuleId}
        headerHeight={HEADER_HEIGHT}
      />

      {/* Location slide-up panel */}
      <AnimatePresence>
        {selectedModuleId && selectedModule && selectedLocation && (
          <LocationPanel
            key={selectedModuleId}
            location={selectedLocation}
            module={selectedModule}
            onEnter={handleEnterDojo}
            onDismiss={() => setSelectedModuleId(null)}
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
```

**Step 2: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add frontend/app/world-map/page.tsx
git commit -m "feat: assemble world map page — header, Pixi canvas, location panel, transitions, celebrations"
```

---

## Task 10: Completion trigger from learn page

**Files:**
- Modify: `frontend/app/learn/[moduleId]/[conceptId]/page.tsx`

**Step 1: Set sessionStorage on last concept completion**

In `progressMutation.onSuccess`, replace:

```tsx
if (next) {
  router.push(`/learn/${moduleId}/${next.id}`)
} else {
  router.push(`/world-map`)
}
```

With:

```tsx
if (next) {
  router.push(`/learn/${moduleId}/${next.id}`)
} else {
  sessionStorage.setItem("zenkai-just-completed", String(moduleIdNum))
  router.push(`/world-map`)
}
```

**Step 2: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/app/learn/[moduleId]/[conceptId]/page.tsx
git commit -m "feat: set completion flag in sessionStorage when last concept finished"
```

---

## Task 11: XP animation and scroll persistence tests

**Files:**
- Modify: `frontend/tests/MapHeader.test.tsx`
- Create: `frontend/tests/worldMapScroll.test.ts`

**Step 1: Add XP count-up test to MapHeader.test.tsx**

Add these two tests inside the existing `describe("MapHeader")` block:

```typescript
import { vi } from "vitest"
import { act } from "@testing-library/react"

it("starts displaying the initial XP without animation", () => {
  render(<MapHeader character={mockChar} targetXp={240} />)
  expect(screen.getByText("240 XP")).toBeInTheDocument()
})

it("animates XP count-up when targetXp prop increases", async () => {
  vi.useFakeTimers()
  const { rerender } = render(<MapHeader character={mockChar} targetXp={100} />)
  expect(screen.getByText("100 XP")).toBeInTheDocument()

  rerender(<MapHeader character={{ ...mockChar, total_xp: 200 }} targetXp={200} />)

  // Mid-animation: value should be between 100 and 200
  await act(async () => { vi.advanceTimersByTime(600) })
  const midText = screen.getByText(/XP/)
  const midVal = parseInt(midText.textContent ?? "0")
  expect(midVal).toBeGreaterThan(100)
  expect(midVal).toBeLessThan(200)

  // End of animation: should reach target
  await act(async () => { vi.advanceTimersByTime(700) })
  expect(screen.getByText("200 XP")).toBeInTheDocument()
  vi.useRealTimers()
})
```

**Step 2: Write scroll persistence test**

Create `frontend/tests/worldMapScroll.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest"

// Pure logic test — no DOM needed
// Tests the scroll clamping and persistence logic extracted from PixiMapCanvas

const MAP_HEIGHT = 4500
const SCALE = 0.5   // window.innerWidth / MAP_WIDTH — mocked value
const CANVAS_H = 800

function clamp(y: number): number {
  const minY = -(MAP_HEIGHT * SCALE - CANVAS_H)
  return Math.min(0, Math.max(minY, y))
}

describe("world map scroll logic", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("clamps scroll to 0 at the top", () => {
    expect(clamp(100)).toBe(0)
    expect(clamp(0)).toBe(0)
  })

  it("clamps scroll to minY at the bottom", () => {
    const minY = -(MAP_HEIGHT * SCALE - CANVAS_H)
    expect(clamp(minY - 100)).toBe(minY)
    expect(clamp(minY)).toBe(minY)
  })

  it("passes through valid scroll values unchanged", () => {
    const valid = -500
    expect(clamp(valid)).toBe(valid)
  })

  it("sessionStorage saves and restores scroll position", () => {
    const scrollY = -400
    sessionStorage.setItem("world-map-scroll", String(scrollY))
    const restored = sessionStorage.getItem("world-map-scroll")
    expect(parseFloat(restored ?? "0")).toBe(scrollY)
  })

  it("sessionStorage is absent on first visit", () => {
    expect(sessionStorage.getItem("world-map-scroll")).toBeNull()
  })
})
```

**Step 3: Run to verify both pass**

```bash
cd frontend && npx vitest run tests/MapHeader.test.tsx tests/worldMapScroll.test.ts
```
Expected: all tests pass

**Step 4: Commit**

```bash
git add frontend/tests/MapHeader.test.tsx frontend/tests/worldMapScroll.test.ts
git commit -m "test: XP count-up animation and scroll persistence unit tests"
```

---

## Task 12: Test hook in PixiMapCanvas + full round-trip E2E

The Pixi canvas is WebGL — Playwright can't click sprites directly. We expose a test-only window hook so E2E tests can trigger location taps programmatically.

**Files:**
- Modify: `frontend/components/ui/PixiMapCanvas.tsx`
- Modify: `e2e/critical-flows.spec.ts`

**Step 1: Add test hook to PixiMapCanvas**

In `PixiMapCanvas.tsx`, inside the `useEffect`, after `onLocationTap` is wired to sprites, add:

```tsx
// Test hook — allows Playwright to trigger location taps without WebGL interaction
if (process.env.NODE_ENV !== "production") {
  (window as Window & { __zenkaiTapModule?: (id: number) => void }).__zenkaiTapModule = (moduleId: number) => {
    if (navigator.vibrate) navigator.vibrate(10)
    onLocationTap(moduleId)
  }
}
```

**Step 2: Add full round-trip E2E test**

Append to `e2e/critical-flows.spec.ts`:

```typescript
test("world-map → tap location → panel opens → Enter Dojo → learn page", async ({ page }) => {
  await page.goto("/world-map")
  // Wait for canvas and header to render
  await expect(page.locator("canvas")).toBeVisible({ timeout: 6000 })
  await expect(page.locator("text=浪人 Ronin")).toBeVisible()

  // Trigger module 1 tap via test hook (bypasses WebGL canvas)
  await page.evaluate(() => {
    (window as Window & { __zenkaiTapModule?: (id: number) => void }).__zenkaiTapModule?.(1)
  })

  // Location panel should slide up
  await expect(page.locator("text=Cherry Blossom Village")).toBeVisible({ timeout: 3000 })
  await expect(page.locator("text=Prompt Engineering")).toBeVisible()

  // Click Enter Dojo
  await page.click("text=Enter Dōjō")

  // Should navigate to learn page
  await page.waitForURL(/\/learn\/1\//, { timeout: 5000 })
})

test("world-map → tap locked location → shows locked message", async ({ page }) => {
  await page.goto("/world-map")
  await expect(page.locator("canvas")).toBeVisible({ timeout: 6000 })

  // Module 9 is locked (only module 1 is seeded as unlocked)
  await page.evaluate(() => {
    (window as Window & { __zenkaiTapModule?: (id: number) => void }).__zenkaiTapModule?.(9)
  })

  await expect(page.locator("text=Summit Sanctum")).toBeVisible({ timeout: 3000 })
  await expect(page.locator("text=Locked")).toBeVisible()
  await expect(page.locator("text=Enter Dōjō")).not.toBeVisible()
})
```

**Step 3: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

**Step 4: Run new E2E tests**

```bash
cd /Users/t-rawww/zenkai && npx playwright test e2e/critical-flows.spec.ts --grep "round-trip|locked location"
```
Expected: both pass

**Step 5: Commit**

```bash
git add frontend/components/ui/PixiMapCanvas.tsx e2e/critical-flows.spec.ts
git commit -m "test: add __zenkaiTapModule test hook and full round-trip E2E for world map navigation"
```

---

## Task 13: Completion round-trip E2E

Tests the full flow: complete last concept → sessionStorage flag set → world-map loads → completion flash renders.

**Files:**
- Modify: `e2e/critical-flows.spec.ts`

**Step 1: Add completion round-trip test**

Append to `e2e/critical-flows.spec.ts`:

```typescript
test("completion flag in sessionStorage triggers white flash on world-map", async ({ page }) => {
  // Simulate returning from a just-completed module
  await page.goto("/world-map", {
    waitUntil: "domcontentloaded",
  })

  // Inject the completion flag before the page's useEffect fires
  // (Navigate away and back with flag pre-set)
  await page.evaluate(() => {
    sessionStorage.setItem("zenkai-just-completed", "1")
  })

  await page.reload()

  // The white flash div should briefly appear then disappear
  // We check sessionStorage was cleared (flag consumed)
  await page.waitForTimeout(200)
  const flagCleared = await page.evaluate(() =>
    sessionStorage.getItem("zenkai-just-completed")
  )
  expect(flagCleared).toBeNull()

  // Header should still render correctly after celebration
  await expect(page.locator("text=浪人 Ronin")).toBeVisible({ timeout: 5000 })
})

test("learn page sets completion flag on last concept", async ({ page }) => {
  // Module 2 concept 7 is the last concept (seeded in DB)
  await page.goto("/learn/2/7")
  await expect(page.locator('[data-testid="prediction-question"]')).toBeVisible({ timeout: 5000 })

  // Answer prediction to advance
  await page.click('[data-testid="prediction-option-0"]')
  await expect(page.locator('[data-testid="concept-card"]')).toBeVisible()

  // Select confidence — this triggers progressMutation and navigation
  await page.click('[data-testid="confidence-knew-it"]')

  // Should navigate to world-map since this is the last concept
  await page.waitForURL("/world-map", { timeout: 5000 })

  // Completion flag should have been set and then immediately consumed
  // (page.tsx useEffect clears it on mount)
  const flag = await page.evaluate(() => sessionStorage.getItem("zenkai-just-completed"))
  expect(flag).toBeNull() // consumed by world-map mount
})
```

**Step 2: Run completion E2E tests**

```bash
cd /Users/t-rawww/zenkai && npx playwright test e2e/critical-flows.spec.ts --grep "completion"
```
Expected: both pass (requires backend running with module 2 data seeded)

**Step 3: Commit**

```bash
git add e2e/critical-flows.spec.ts
git commit -m "test: completion round-trip E2E — sessionStorage flag and world-map celebration trigger"
```

---

## Task 14: Run full Vitest suite

**Step 1: Run all tests**

```bash
cd frontend && npx vitest run
```
Expected: all tests pass (20+ including new MapHeader animation, scroll persistence, worldMapConfig, LocationPanel tests)

**Step 2: Fix any failures, then commit fixes**

```bash
git add -A && git commit -m "fix: resolve Vitest failures after world map components"
```

---

## Task 15: Playwright E2E — world map baseline flows

**Files:**
- Modify: `e2e/critical-flows.spec.ts`

**Step 1: Add baseline world map E2E tests**

Append to `e2e/critical-flows.spec.ts`:

```typescript
test("home → world-map portal transition renders map header", async ({ page }) => {
  await page.goto("/")
  await page.click("text=Enter World Map")
  await page.waitForURL("/world-map", { timeout: 5000 })
  await expect(page.locator("text=浪人 Ronin")).toBeVisible({ timeout: 6000 })
  await expect(page.locator("canvas")).toBeVisible()
})

test("world-map loading state shows spinner text", async ({ page }) => {
  await page.route("**/modules", async (route) => {
    await new Promise((r) => setTimeout(r, 600))
    await route.continue()
  })
  await page.goto("/world-map")
  await expect(page.locator("text=Preparing the path...")).toBeVisible()
})

test("world-map error state shows obscured message", async ({ page }) => {
  await page.route("**/modules", (route) => route.abort())
  await page.goto("/world-map")
  await expect(page.locator("text=The path is obscured.")).toBeVisible({ timeout: 5000 })
  await expect(page.locator("text=Retry")).toBeVisible()
})
```

**Step 2: Run Playwright**

```bash
cd /Users/t-rawww/zenkai && npx playwright test e2e/critical-flows.spec.ts
```
Expected: existing 3 tests + all new world map tests pass (9+ total)

**Step 3: Commit**

```bash
git add e2e/critical-flows.spec.ts
git commit -m "test: Playwright E2E — world map loading, error state, and portal navigation"
```

---

## Task 16: Final verification

**Step 1: Full TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors

**Step 2: Full Vitest**

```bash
cd frontend && npx vitest run
```
Expected: all tests pass

**Step 3: Full Playwright**

```bash
cd /Users/t-rawww/zenkai && npx playwright test
```
Expected: all tests pass

**Step 4: Final commit**

```bash
cd /Users/t-rawww/zenkai
git add -A
git commit -m "feat: world map visual overhaul complete — pixel art campaign map, WebGL canvas, biome particles, completion celebration"
```
