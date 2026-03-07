import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ConfidenceChips } from "@/components/learn/ConfidenceChips"

describe("ConfidenceChips", () => {
  it("renders all three chips", () => {
    render(<ConfidenceChips onSelect={vi.fn()} />)
    expect(screen.getByTestId("confidence-guessed")).toBeInTheDocument()
    expect(screen.getByTestId("confidence-somewhat-sure")).toBeInTheDocument()
    expect(screen.getByTestId("confidence-knew-it")).toBeInTheDocument()
  })

  it("calls onSelect with correct confidence value", () => {
    const onSelect = vi.fn()
    render(<ConfidenceChips onSelect={onSelect} />)
    fireEvent.click(screen.getByTestId("confidence-knew-it"))
    expect(onSelect).toHaveBeenCalledWith("knew_it")
  })

  it("disabled chips are not clickable", () => {
    const onSelect = vi.fn()
    render(<ConfidenceChips onSelect={onSelect} disabled />)
    fireEvent.click(screen.getByTestId("confidence-knew-it"))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
