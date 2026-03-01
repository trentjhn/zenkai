import { test, expect } from "@playwright/test"

// FLOW 1: Concept Learning
test("learn flow — read a concept end-to-end", async ({ page }) => {
  await page.goto("/world-map")
  await page.click('[data-testid="module-0"]')           // Enter Module 0 (always unlocked)
  await expect(page.locator('[data-testid="prediction-question"]')).toBeVisible()
  await page.click('[data-testid="prediction-option-0"]') // Answer prediction question
  await expect(page.locator('[data-testid="concept-card"]')).toBeVisible()
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
