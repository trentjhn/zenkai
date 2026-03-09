import { describe, it, expect, vi } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { AppHeader as MapHeader } from "@/components/ui/AppHeader"

vi.mock("@/components/ui/RoninSprite", () => ({
  RoninSprite: () => <div data-testid="ronin-sprite" />,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

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

  it("starts displaying the initial XP without animation", () => {
    render(<MapHeader character={mockChar} targetXp={240} />)
    expect(screen.getByText("240 XP")).toBeInTheDocument()
  })

  it("calls onBack override instead of router.back when provided", () => {
    const onBack = vi.fn()
    render(<MapHeader backHref="/world-map" onBack={onBack} />)
    fireEvent.click(screen.getByRole("button"))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it("animates XP count-up when targetXp prop increases", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "setTimeout", "performance"] })
    const { rerender } = render(<MapHeader character={mockChar} targetXp={100} />)
    expect(screen.getByText("100 XP")).toBeInTheDocument()

    rerender(<MapHeader character={{ ...mockChar, total_xp: 200 }} targetXp={200} />)

    // Advance well past the 1200ms animation duration to reach the final value
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(screen.getByText("200 XP")).toBeInTheDocument()
    vi.useRealTimers()
  })
})
