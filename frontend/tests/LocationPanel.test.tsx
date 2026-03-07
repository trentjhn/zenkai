import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { LocationPanel } from "@/components/ui/LocationPanel"
import { LOCATIONS } from "@/lib/worldMapConfig"

// Mock framer-motion to avoid animation issues in jsdom
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

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
