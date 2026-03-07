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
