import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type React from "react"
import { useMutation } from "@tanstack/react-query"
import type { CompleteResponse } from "@/lib/types"

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
    if (queryKey[0] === "modules") {
      return {
        data: { id: 2, title: "Prompt Engineering", concepts: [{ id: 1 }, { id: 2 }, { id: 3 }] },
        isLoading: false,
      }
    }
    return { data: null, isLoading: false }
  },
  useMutation: vi.fn(),
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

function mockMutation(data: unknown = null) {
  vi.mocked(useMutation).mockReturnValue({
    mutate: vi.fn(),
    data,
    isPending: false,
    isSuccess: data !== null,
    isError: false,
    isIdle: data === null,
    reset: vi.fn(),
  } as ReturnType<typeof useMutation<CompleteResponse, Error, void>>)
}

describe("CompletePage", () => {
  it("renders module title", () => {
    mockMutation()
    render(<CompletePage />)
    expect(screen.getByText("Prompt Engineering")).toBeInTheDocument()
  })

  it("renders XP value", () => {
    mockMutation()
    render(<CompletePage />)
    expect(screen.getByTestId("xp-display")).toBeInTheDocument()
  })

  it("renders return button", () => {
    mockMutation()
    render(<CompletePage />)
    expect(screen.getByTestId("return-btn")).toBeInTheDocument()
  })

  it("shows score when complete mutation returns data", () => {
    mockMutation({ score: 0.857, next_module_id: 3, next_module_unlocked: false })
    render(<CompletePage />)
    expect(screen.getByTestId("score-display")).toBeInTheDocument()
  })

  it("shows unlock banner when next module is unlocked", () => {
    mockMutation({ score: 0.857, next_module_id: 3, next_module_unlocked: true })
    render(<CompletePage />)
    expect(screen.getByTestId("unlock-banner")).toBeInTheDocument()
  })

  it("hides unlock banner when score below threshold", () => {
    mockMutation({ score: 0.6, next_module_id: 3, next_module_unlocked: false })
    render(<CompletePage />)
    expect(screen.queryByTestId("unlock-banner")).not.toBeInTheDocument()
  })

  it("calls completeModule on mount", () => {
    const mutate = vi.fn()
    vi.mocked(useMutation).mockReturnValue({
      mutate,
      data: null,
      isPending: false,
      isSuccess: false,
      isError: false,
      isIdle: true,
      reset: vi.fn(),
    } as ReturnType<typeof useMutation<CompleteResponse, Error, void>>)
    render(<CompletePage />)
    expect(mutate).toHaveBeenCalledTimes(1)
  })
})
