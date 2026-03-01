import { render, screen } from "@testing-library/react"
import { SamuraiButton } from "@/components/ui/SamuraiButton"

test("renders with clipped-corners class", () => {
  const { container } = render(<SamuraiButton>Enter</SamuraiButton>)
  expect(container.firstChild).toHaveClass("clipped-corners")
})

test("renders all three variants without error", () => {
  const { rerender } = render(<SamuraiButton variant="primary">X</SamuraiButton>)
  rerender(<SamuraiButton variant="ghost">X</SamuraiButton>)
  rerender(<SamuraiButton variant="danger">X</SamuraiButton>)
})

test("forwards ref correctly", () => {
  let buttonRef: HTMLButtonElement | null = null
  render(
    <SamuraiButton ref={(el) => { buttonRef = el }}>Click</SamuraiButton>
  )
  expect(buttonRef).not.toBeNull()
})
