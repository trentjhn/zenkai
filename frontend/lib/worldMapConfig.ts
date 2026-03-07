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

// moduleId matches the actual database module IDs (2–10).
// Module 1 in the DB is "AI PM Foundations" (KB context, not a learnable module).
export const LOCATIONS: WorldMapLocation[] = [
  {
    moduleId: 2, name: "Cherry Blossom Village", biome: "cherry-blossom",
    x: 400, y: 4100, accentColor: 0xFFB7C5, particleType: "sakura",
    spriteUrl: "/assets/map/locations/module-1-cherry-village.png",
  },
  {
    moduleId: 3, name: "Bamboo Forest Temple", biome: "bamboo-forest",
    x: 350, y: 3600, accentColor: 0x4CAF50, particleType: "firefly",
    spriteUrl: "/assets/map/locations/module-2-bamboo-temple.png",
  },
  {
    moduleId: 4, name: "Mountain Monastery", biome: "mountain",
    x: 420, y: 3100, accentColor: 0x9E9E9E, particleType: "mist",
    spriteUrl: "/assets/map/locations/module-3-mountain-monastery.png",
  },
  {
    moduleId: 5, name: "Clockwork Fortress", biome: "clockwork",
    x: 380, y: 2600, accentColor: 0xB8860B, particleType: "sparks",
    spriteUrl: "/assets/map/locations/module-4-clockwork-fortress.png",
  },
  {
    moduleId: 6, name: "Volcano Shrine", biome: "volcano",
    x: 440, y: 2200, accentColor: 0xFF4500, particleType: "ash",
    spriteUrl: "/assets/map/locations/module-5-volcano-shrine.png",
  },
  {
    moduleId: 7, name: "Frozen Tundra", biome: "ice",
    x: 360, y: 1800, accentColor: 0x81D4FA, particleType: "snow",
    spriteUrl: "/assets/map/locations/module-6-ice-cavern.png",
  },
  {
    moduleId: 8, name: "Desert Ruins", biome: "desert",
    x: 420, y: 1400, accentColor: 0xD4A017, particleType: "sand",
    spriteUrl: "/assets/map/locations/module-7-desert-ruins.png",
  },
  {
    moduleId: 9, name: "Shadow Cliffside", biome: "shadow",
    x: 370, y: 950, accentColor: 0x37474F, particleType: "rain",
    spriteUrl: "/assets/map/locations/module-8-shadow-fortress.png",
  },
  {
    moduleId: 10, name: "Summit Sanctum", biome: "summit",
    x: 400, y: 400, accentColor: 0xFFE066, particleType: "cloud",
    spriteUrl: "/assets/map/locations/module-9-summit-sanctum.png",
  },
]

export function getLocationByModuleId(moduleId: number): WorldMapLocation | undefined {
  return LOCATIONS.find((l) => l.moduleId === moduleId)
}
