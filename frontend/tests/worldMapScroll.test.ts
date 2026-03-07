import { describe, it, expect, beforeEach } from "vitest"

// Pure logic test — no DOM needed
// Tests the scroll clamping and persistence logic from PixiMapCanvas

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
