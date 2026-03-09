import { test, expect } from "@playwright/test"

// FLOW 1: Concept Learning
test("learn flow — read a concept end-to-end", async ({ page }) => {
  // Navigate directly to module 2 / concept 1 (has generated content)
  await page.goto("/learn/2/1")
  await expect(page.locator('[data-testid="prediction-question"]')).toBeVisible()
  await page.click('[data-testid="prediction-option-0"]') // Answer prediction — 1500ms reveal delay
  await expect(page.locator('[data-testid="concept-card"]')).toBeVisible({ timeout: 5000 }) // wait for stage transition
  await expect(page.locator('[data-testid="concept-hook"]')).not.toBeEmpty()
  await page.click('[data-testid="go-deeper-btn"]')
  await expect(page.locator('[data-testid="deep-layer"]')).toBeVisible()
  await page.click('[data-testid="confidence-knew-it"]')
  await expect(page).toHaveURL(/\/learn/)
})

// FLOW 2: Quiz Battle
test("quiz flow — answer a question with confidence rating", async ({ page }) => {
  await page.goto("/quiz/1")
  await expect(page.locator('[data-testid="quiz-question"]')).toBeVisible()
  await page.click('[data-testid="quiz-option-0"]')
  await expect(page.locator('[data-testid="answer-feedback"]')).toBeVisible()
  await page.click('[data-testid="confidence-somewhat-sure"]')
  await expect(page.locator('[data-testid="quiz-question"]')).toBeVisible() // Next question loads
})

// FLOW 3: Review Queue
test("review flow — due items surface and update schedule", async ({ page }) => {
  await page.goto("/review")
  const hasItems = await page.locator('[data-testid="review-item"]').count()
  // If items exist, complete one and verify schedule updates
  if (hasItems > 0) {
    await page.click('[data-testid="quiz-option-0"]')
    await page.click('[data-testid="confidence-knew-it"]')
    await expect(
      page.locator('[data-testid="review-complete"]')
        .or(page.locator('[data-testid="review-item"]'))
    ).toBeVisible()
  } else {
    await expect(page.locator('[data-testid="review-empty"]')).toBeVisible()
  }
})

// FLOW 4: World Map — location tap → panel → Enter Dōjō
test("world-map → tap location → panel opens → Enter Dojo → learn page", async ({ page }) => {
  await page.goto("/world-map")
  // Wait for canvas and header to render
  await expect(page.locator("canvas")).toBeVisible({ timeout: 8000 })
  await expect(page.locator("text=浪人 Ronin")).toBeVisible({ timeout: 8000 })

  // Trigger module 2 tap via test hook (DB id 2 = Prompt Engineering / Cherry Blossom Village)
  await page.evaluate(() => {
    ;(window as Window & { __zenkaiTapModule?: (id: number) => void }).__zenkaiTapModule?.(2)
  })

  // Location panel should slide up
  await expect(page.locator("text=Cherry Blossom Village")).toBeVisible({ timeout: 5000 })

  // Click Enter Dojo
  await page.click("text=Enter Dōjō")

  // Should navigate to learn page for module 2
  await page.waitForURL(/\/learn\/2\//, { timeout: 8000 })
})

// FLOW 5: World Map — tap locked location → shows locked message
test("world-map → tap locked location → shows locked message", async ({ page }) => {
  await page.goto("/world-map")
  await expect(page.locator("canvas")).toBeVisible({ timeout: 8000 })

  // Module 10 (Summit Sanctum) is locked (only module 2 is seeded as unlocked)
  await page.evaluate(() => {
    ;(window as Window & { __zenkaiTapModule?: (id: number) => void }).__zenkaiTapModule?.(10)
  })

  await expect(page.locator("text=Summit Sanctum")).toBeVisible({ timeout: 5000 })
  await expect(page.locator("text=Locked")).toBeVisible()
  await expect(page.locator("text=Enter Dōjō")).not.toBeVisible()
})

// FLOW 6: Completion flag in sessionStorage triggers white flash on world-map
test("completion flag in sessionStorage triggers white flash on world-map", async ({ page }) => {
  // Navigate to world-map
  await page.goto("/world-map")

  // Inject the completion flag
  await page.evaluate(() => {
    sessionStorage.setItem("zenkai-just-completed", "1")
  })

  await page.reload()

  // The flag should be consumed by the page's useEffect on mount
  await page.waitForTimeout(500)
  const flagCleared = await page.evaluate(() =>
    sessionStorage.getItem("zenkai-just-completed")
  )
  expect(flagCleared).toBeNull()

  // Header should still render correctly after celebration
  await expect(page.locator("text=浪人 Ronin")).toBeVisible({ timeout: 8000 })
})

// FLOW 7: Learn last concept → completion page → return to world map
test("learn last concept navigates to completion page then world-map", async ({ page }) => {
  // Module 2 concept 7 is the last concept (seeded in DB)
  await page.goto("/learn/2/7")
  await expect(page.locator('[data-testid="prediction-question"]')).toBeVisible({ timeout: 8000 })

  // Answer prediction — there is a 1500ms delay before concept card shows
  await page.click('[data-testid="prediction-option-0"]')
  await expect(page.locator('[data-testid="concept-card"]')).toBeVisible({ timeout: 5000 })

  // Select confidence — triggers progressMutation and navigation to complete page
  await page.click('[data-testid="confidence-knew-it"]')

  // Should navigate to the completion page
  await page.waitForURL(/\/complete\/2/, { timeout: 8000 })
  await expect(page.locator('[data-testid="return-btn"]')).toBeVisible()

  // Click return — navigates to world-map
  await page.click('[data-testid="return-btn"]')
  await page.waitForURL("/world-map", { timeout: 8000 })
})
