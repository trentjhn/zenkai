import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MapHeader } from "@/components/ui/MapHeader"

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
})
