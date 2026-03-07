# World Map — Design Document

**Date:** 2026-03-06
**Status:** Approved
**Phase:** World Map Visual Polish (post-Phase 9)

---

## Overview

The world map is the central hub of Zenkai — where every session begins and ends. After the ink-wash portal transition from the home page, the player arrives here and chooses their next module. It must feel like a living world, not a list of links.

The design is a Pokémon HeartGold/SoulSilver-inspired pixel art campaign map with 9 distinct biomes, each representing one learnable module. Locked modules are shrouded in fog. Completed modules bear a golden seal. The player's Ronin marker sits on their current location.

---

## Module → Location Mapping

| Module | Name | Biome | Atmosphere |
|--------|------|-------|------------|
| 1 | Prompt Engineering | Cherry Blossom Village | Starting town, spring, gentle — where the journey begins |
| 2 | Context Engineering | Bamboo Forest Temple | Dense layered forest, lanterns, hidden paths |
| 3 | Reasoning LLMs | Mountain Monastery | High altitude, fog rolling in, stone bridges |
| 4 | Agentic Engineering | Clockwork Fortress | Mechanical castle, gears, complex systems |
| 5 | Skills | Volcano Shrine | Active lava, fire temple built into the caldera |
| 6 | Evaluation | Frozen Tundra / Ice Caverns | Crystalline, cold, precise |
| 7 | Fine-tuning | Desert Ruins / Sand Temple | Patient excavation, ancient stone, oasis |
| 8 | AI Security | Shadow Cliffside Fortress | Dark ocean cliffs, storm clouds, dramatic |
| 9 | Playbooks | Summit Sanctum | Peak of the mountain, clouds below, final destination |

Map reads **bottom to top** — Cherry Blossom Village at the bottom, Summit Sanctum at the top. Locked modules above the player are fogged. A winding pixel art path (dirt road → stone path → mountain trail) connects all 9 locations.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Background image | Gemini / Nano Banana | Full-height pixel art landscape — all 9 biomes composited into one vertical image |
| Location sprites | PixelLab MCP | Individual pixel art icons per module (shrine, fortress, temple, etc.) |
| Interactive canvas | `@pixi/react` + Pixi.js | WebGL-rendered fog, glow filters, ambient particles, sprite rendering |
| UI overlays | Framer Motion | Slide-up location panel, page transitions |
| State | React Query | Module/character data, scroll position via session storage |

---

## Layout

### Fixed Header
Always visible above the canvas. Two zones:

**Left:**
- Ronin sprite (breathing-idle animation, scale 1)
- Current form name (`浪人 Ronin` / `Warrior` / `Samurai` / `The Ghost`)
- XP total — animates up (count-up ticker) when returning from a completed concept

**Right:**
- Currency display — coin icon + amount, grayed/placeholder, reserved for future marketplace
- Review Queue button — navigates to `/review`

Styled: `zen-void` background, `clipped-corners`, `zen-gold` accents. Consistent with home page aesthetic.

### Map Canvas
Full-screen below the header. Vertically scrollable (touch + mouse).

- Gemini-generated background image fills the canvas height
- PixelLab location sprites positioned at fixed pixel coordinates on the canvas
- Winding connecting path rendered as a Pixi Graphics layer
- Player Ronin marker sprite anchored to current module location
- Pixi.js handles all rendering — no CSS overlays on the canvas

---

## Location States

Three visual states per module location:

| State | Visual |
|-------|--------|
| **Locked** | Fogged overlay (dark animated Pixi particles), sprite desaturated, no tap interaction |
| **Unlocked / In Progress** | Full color sprite, pulsing Pixi GlowFilter, player marker here if current |
| **Completed** | Golden seal overlay on sprite, warm steady glow (no pulse), no player marker |

---

## Ambient Particles (per biome)

Each biome has a looping Pixi particle system to make the map feel alive:

| Module | Particle Effect |
|--------|----------------|
| 1 — Cherry Blossom Village | Pink sakura petals drifting |
| 2 — Bamboo Forest Temple | Firefly glints, slow leaf fall |
| 3 — Mountain Monastery | Slow mist wisps |
| 4 — Clockwork Fortress | Gear spark embers |
| 5 — Volcano Shrine | Upward heat shimmer + ash sparks |
| 6 — Frozen Tundra | Falling snow, slow drift |
| 7 — Desert Ruins | Sand dust swirl |
| 8 — Shadow Cliffside | Rain + lightning flicker |
| 9 — Summit Sanctum | Cloud wisps, star glints |

---

## Interactions

### Tap / Click a Location
Opens a **Framer Motion slide-up panel** (not full navigation — prevents accidental entry):
- Module name + biome name
- Progress: concepts completed / total
- Completed badge if finished
- **"Enter Dōjō"** button (unlocked) or **"Locked — complete [previous module] first"** (locked)

### Enter Dōjō
Triggers transition: fade to black + brief flash of the module's biome accent color → navigate to `/learn/[moduleId]/[firstConceptId]`.

### Return from Learn / Quiz
- Scroll position restored from session storage (user lands where they left off)
- If XP increased: header XP counter animates up
- If module completed: particle burst from location sprite + golden seal animates in + brief screen flash

### Module Completion Celebration
Triggered when the last concept in a module is marked complete and the user returns to world map:
- Location sprite swaps to completed state
- Golden seal scales in with a Framer Motion spring
- Pixi particle burst radiates from location
- Brief white screen flash (opacity 0 → 0.4 → 0, 400ms)

---

## Camera Behavior

**On mount (arrival from home page):**
1. Canvas fades in from black (ink-wash portal arrival)
2. Camera starts zoomed in (1.5x) on player's current location
3. Slowly eases out to 1x over 1.2s

**Pinch-to-zoom (mobile):**
- Clamp: 0.8x minimum, 2x maximum
- Pixi viewport handles pinch natively

**Scroll:**
- Vertical only
- Rubber-band at top and bottom edges
- Position persisted in `sessionStorage` key `world-map-scroll`

---

## Loading State

Replace the current "Loading..." text with a full-screen loading scene:
- `zen-void` background
- Centered pixel art spinning zen circle animation (CSS or Pixi)
- Subtitle: `"Preparing the path..."` in `font-mono text-xs tracking-widest text-zen-plasma/50`

## Error State

If API call fails:
- Full-screen `zen-void` background
- A styled scroll/parchment element unfurling with text: `"The path is obscured."`
- Retry button styled as `SamuraiButton`

---

## Mobile / PWA

- Touch scroll and pinch-to-zoom natively handled by Pixi viewport
- Haptic feedback on location tap: `navigator.vibrate(10)`
- Header collapses form name on very small screens (< 380px), keeps sprite + XP + currency
- All tap targets minimum 44×44px

---

## Tests

### Vitest (component)
- Header renders correct form name and XP from API data
- XP count-up animation triggers on prop change
- Location renders in correct state (locked / unlocked / completed) based on module data
- Slide-up panel appears on location tap, disappears on dismiss
- Locked location panel shows locked message, not Enter Dōjō
- Scroll position saved to sessionStorage on scroll, restored on mount
- Error state renders with retry button when API fails

### Playwright (E2E)
- Navigate from home → world-map via ink-wash portal → map renders
- Tap unlocked module → slide-up panel appears → Enter Dōjō → navigates to learn page
- Locked module tap → panel shows locked message, no navigation occurs
- Complete a concept → return to world-map → XP counter has increased

---

## Asset Generation Plan

### Background Image (Gemini / Nano Banana)
Single tall vertical pixel art image (~800×4000px). Prompt should specify:
- Top-down perspective, Japanese pixel art style (Pokémon HeartGold aesthetic)
- Nine distinct vertical zones from bottom to top: cherry blossom village → bamboo forest → mountain monastery → clockwork fortress → volcano shrine → frozen tundra → desert ruins → shadow cliffside → summit sanctum
- Connected by a winding path throughout
- Consistent pixel density, muted palette with vibrant accent colors per biome

### Location Sprites (PixelLab)
One sprite per module. Top-down view, 64×64px canvas, pixel art, no background. Each sprite represents the architectural/environmental landmark for that biome (shrine gate, bamboo pagoda, stone monastery, gear fortress, fire temple, ice palace, desert pyramid, dark keep, mountain sanctum).

---

## Out of Scope (This Phase)

- Marketplace / currency functionality (slot reserved in header only)
- Character sheet / evolution screen
- Learn / quiz / review page polish (separate phases)
- Multiplayer or social features
