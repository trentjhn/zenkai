import { render, screen } from "@testing-library/react"
import { AssetPlaceholder } from "@/components/ui/AssetPlaceholder"

test("renders asset name as label", () => {
  render(<AssetPlaceholder name="ronin_idle" width={96} height={128} />)
  expect(screen.getByText("[ronin_idle]")).toBeInTheDocument()
})

test("applies correct dimensions via inline style", () => {
  const { container } = render(
    <AssetPlaceholder name="test" width={64} height={80} />
  )
  const el = container.firstChild as HTMLElement
  expect(el.style.width).toBe("64px")
  expect(el.style.height).toBe("80px")
})
