import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type React from "react"

// Mock Next.js navigation — must be declared before page import (Vitest hoists vi.mock)
vi.mock("next/navigation", () => ({
  useParams: () => ({ moduleId: "2" }),
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock React Query
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === "character") {
      return { data: { character_form: 1, total_xp: 350 }, isLoading: false }
    }
    // queryKeys.module(id) returns ["modules", id] — check first segment
    if (queryKey[0] === "modules") {
      return {
        data: { id: 2, title: "Prompt Engineering", concepts: [{ id: 1 }, { id: 2 }, { id: 3 }] },
        isLoading: false,
      }
    }
    return { data: null, isLoading: false }
  },
}))

vi.mock("@/components/ui/RoninSprite", () => ({
  RoninSprite: () => <div data-testid="ronin-sprite" />,
}))

vi.mock("@/components/ui/AppHeader", () => ({
  AppHeader: () => <div data-testid="app-header" />,
  APP_HEADER_HEIGHT: 88,
}))

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Static import — Vitest hoists vi.mock calls above this
import CompletePage from "@/app/complete/[moduleId]/page"

describe("CompletePage", () => {
  it("renders module title", () => {
    render(<CompletePage />)
    expect(screen.getByText("Prompt Engineering")).toBeInTheDocument()
  })

  it("renders XP value", () => {
    render(<CompletePage />)
    expect(screen.getByTestId("xp-display")).toBeInTheDocument()
  })

  it("renders return button", () => {
    render(<CompletePage />)
    expect(screen.getByTestId("return-btn")).toBeInTheDocument()
  })
})
