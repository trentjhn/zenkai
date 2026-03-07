import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ConceptCard } from "@/components/learn/ConceptCard"
import type { DefaultLayer, DeepLayer } from "@/lib/types"

const mockDefault: DefaultLayer = {
  title: "Chain-of-Thought",
  hook: "Think before answering.",
  explanation: ["CoT works by...", "It improves accuracy because..."],
  analogy: "Like showing your work in math.",
}

const mockDeep: DeepLayer = {
  mechanism: ["Step 1", "Step 2"],
  edge_cases: ["Short prompts don't benefit"],
  key_number: "78.7% vs 17.7% accuracy",
  failure_story: "GPT-3 failed when...",
}

describe("ConceptCard", () => {
  it("renders hook text", () => {
    render(<ConceptCard defaultLayer={mockDefault} deepLayer={mockDeep} />)
    expect(screen.getByText("Think before answering.")).toBeInTheDocument()
  })

  it("deep layer is hidden by default", () => {
    render(<ConceptCard defaultLayer={mockDefault} deepLayer={mockDeep} />)
    expect(screen.queryByText("78.7% vs 17.7% accuracy")).not.toBeInTheDocument()
  })

  it("clicking Go Deeper reveals deep layer", () => {
    render(<ConceptCard defaultLayer={mockDefault} deepLayer={mockDeep} />)
    fireEvent.click(screen.getByTestId("go-deeper-btn"))
    expect(screen.getByText("78.7% vs 17.7% accuracy")).toBeInTheDocument()
  })

  it("button toggles copy correctly", () => {
    render(<ConceptCard defaultLayer={mockDefault} deepLayer={mockDeep} />)
    const btn = screen.getByTestId("go-deeper-btn")
    expect(btn.textContent).toContain("Go Deeper")
    fireEvent.click(btn)
    expect(btn.textContent).toContain("Close Scroll")
  })

  it("renders explanation paragraphs", () => {
    render(<ConceptCard defaultLayer={mockDefault} deepLayer={mockDeep} />)
    expect(screen.getByText("CoT works by...")).toBeInTheDocument()
    expect(screen.getByText("It improves accuracy because...")).toBeInTheDocument()
  })
})
