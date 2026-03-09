import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { PredictionQuestion } from "@/components/learn/PredictionQuestion"
import type { PredictionQuestion as PredictionQuestionType } from "@/lib/types"

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockData: PredictionQuestionType = {
  question: "What is chain-of-thought?",
  options: ["Guessing", "Step-by-step reasoning", "Fine-tuning", "Embedding"],
  correct_index: 1,
  reveal_explanation: "CoT makes the model reason step by step.",
}

describe("PredictionQuestion", () => {
  it("renders the question", () => {
    render(<PredictionQuestion data={mockData} onAnswer={() => {}} revealed={false} />)
    expect(screen.getByText("What is chain-of-thought?")).toBeInTheDocument()
  })

  it("disables options after selection", () => {
    render(<PredictionQuestion data={mockData} onAnswer={() => {}} revealed={false} />)
    fireEvent.click(screen.getByTestId("prediction-option-0"))
    expect(screen.getByTestId("prediction-option-1")).toBeDisabled()
  })

  it("calls onAnswer with selected index", () => {
    const onAnswer = vi.fn()
    render(<PredictionQuestion data={mockData} onAnswer={onAnswer} revealed={false} />)
    fireEvent.click(screen.getByTestId("prediction-option-1"))
    expect(onAnswer).toHaveBeenCalledWith(1)
  })

  it("shows reveal explanation when revealed=true and option selected", () => {
    render(<PredictionQuestion data={mockData} onAnswer={() => {}} revealed={true} />)
    fireEvent.click(screen.getByTestId("prediction-option-0"))
    expect(screen.getByText("CoT makes the model reason step by step.")).toBeInTheDocument()
  })

  it("does not show reveal explanation when revealed=false", () => {
    render(<PredictionQuestion data={mockData} onAnswer={() => {}} revealed={false} />)
    fireEvent.click(screen.getByTestId("prediction-option-0"))
    expect(screen.queryByText("CoT makes the model reason step by step.")).not.toBeInTheDocument()
  })
})
