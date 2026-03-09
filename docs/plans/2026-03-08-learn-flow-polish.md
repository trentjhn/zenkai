# Learn Flow Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the broken learn/quiz UX flow: prediction reveal, back navigation, progress indicators, quiz scoring, and a celebration completion screen.

**Architecture:** Nine targeted changes across the learn, quiz, and world-map pages plus one new page (`/complete/[moduleId]`). No new backend routes needed — all data comes from existing character and module queries. The completion page replaces the current silent `router.push('/world-map')` that ends the learn flow.

**Tech Stack:** Next.js 14 App Router, React 18, Framer Motion, React Query, Vitest + Testing Library, Playwright E2E.

---

## Context (read before touching any file)

- **`frontend/app/learn/[moduleId]/[conceptId]/page.tsx`** — Two-stage learn flow: `prediction` → `concept`. On last concept, `progressMutation.onSuccess` currently does `router.push('/world-map')`.
- **`frontend/app/quiz/[conceptId]/page.tsx`** — Multi-question quiz with segmented progress bar. Routes to `/world-map` after all questions.
- **`frontend/components/learn/PredictionQuestion.tsx`** — Has full reveal logic (emerald/sakura color-coded answers + `reveal_explanation` text) gated by `revealed` prop — but `learn/page.tsx` passes `revealed={false}` and calls `setStage("concept")` synchronously, killing the component before any reveal shows.
- **`frontend/components/ui/AppHeader.tsx`** — `handleBack()` calls `router.back()`. During learn/quiz, this navigates to the previous concept URL instead of exiting the session.
- **`frontend/components/ui/LocationPanel.tsx`** — Slide-up panel. Currently requires `selectedModuleDetail` to render, causing a blank dead-tap period while the API call loads. Has no visible dismiss button (only invisible backdrop).
- **`frontend/app/globals.css`** — `register-study` and `register-battle` classes use `min-h-screen` which causes iOS Safari viewport jump. Should be `min-h-[100dvh]`.
- **`e2e/critical-flows.spec.ts`** — Flow 7 expects `waitForURL("/world-map")` on last concept. This will break when we route to `/complete/[moduleId]` instead. Must be updated.
- **`frontend/lib/worldMapConfig.ts`** — `getLocationByModuleId(moduleId)` returns the `WorldMapLocation` for a module. Use this on the completion page to get the biome/location name without a backend call.
- **`frontend/lib/api.ts`** and **`frontend/lib/queryKeys.ts`** — Use `api.getModule(moduleId)` and `api.getCharacter()` on the completion page.

---

## Task 1: AppHeader `onBack` override prop

**Files:**
- Modify: `frontend/components/ui/AppHeader.tsx`
- Modify: `frontend/app/learn/[moduleId]/[conceptId]/page.tsx`
- Modify: `frontend/app/quiz/[conceptId]/page.tsx`
- Test: `frontend/tests/MapHeader.test.tsx`

**Step 1: Write the failing test**

Add to `frontend/tests/MapHeader.test.tsx` inside the `describe("MapHeader", ...)` block:

```tsx
it("calls onBack override instead of router.back when provided", () => {
  const onBack = vi.fn()
  render(<MapHeader backHref="/world-map" onBack={onBack} />)
  fireEvent.click(screen.getByRole("button"))
  expect(onBack).toHaveBeenCalledTimes(1)
})
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run tests/MapHeader.test.tsx
```

Expected: FAIL — `onBack` prop does not exist on `AppHeaderProps`.

**Step 3: Add `onBack` prop to AppHeader**

In `frontend/components/ui/AppHeader.tsx`, update the interface and the button's `onClick`:

```tsx
interface AppHeaderProps {
  character?: { character_form: number; total_xp: number }
  targetXp?: number
  backHref?: string
  backLabel?: string
  /** When provided, overrides the default smart-back navigation. */
  onBack?: () => void
}

export function AppHeader({
  character,
  targetXp = 0,
  backHref,
  backLabel = "Back",
  onBack,
}: AppHeaderProps) {
  // ... existing code ...

  function handleBack() {
    if (onBack) {
      onBack()
      return
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else if (backHref) {
      router.push(backHref)
    }
  }
```

**Step 4: Update learn page to use `onBack`**

In `frontend/app/learn/[moduleId]/[conceptId]/page.tsx`, update the AppHeader call:

```tsx
<AppHeader
  backHref="/world-map"
  backLabel="Exit"
  onBack={() => router.push("/world-map")}
/>
```

**Step 5: Update quiz page to use `onBack`**

In `frontend/app/quiz/[conceptId]/page.tsx`, update the AppHeader call:

```tsx
<AppHeader
  backHref="/world-map"
  backLabel="Exit"
  onBack={() => router.push("/world-map")}
/>
```

**Step 6: Run tests to verify passing**

```bash
cd frontend && npx vitest run tests/MapHeader.test.tsx
```

Expected: All tests PASS.

**Step 7: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

**Step 8: Commit**

```bash
git checkout -b feat/learn-flow-polish
git add frontend/components/ui/AppHeader.tsx \
        frontend/app/learn/[moduleId]/[conceptId]/page.tsx \
        frontend/app/quiz/[conceptId]/page.tsx \
        frontend/tests/MapHeader.test.tsx
git commit -m "feat: add AppHeader onBack override for learn/quiz exit"
```

---

## Task 2: Prediction reveal — show answer colors + explanation before advancing

**Files:**
- Modify: `frontend/app/learn/[moduleId]/[conceptId]/page.tsx`
- Create: `frontend/tests/PredictionQuestion.test.tsx`

**Step 1: Write the failing test**

Create `frontend/tests/PredictionQuestion.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
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
```

**Step 2: Run test to verify it passes as-is**

```bash
cd frontend && npx vitest run tests/PredictionQuestion.test.tsx
```

Expected: PASS — the component itself is correct; we're confirming the contract.

**Step 3: Fix the learn page to use `revealed={true}` and delay the stage transition**

In `frontend/app/learn/[moduleId]/[conceptId]/page.tsx`, update the state and handler:

Replace the existing `stage` state with:

```tsx
const [stage, setStage] = useState<Stage>("prediction")
```

Keep as is. Then replace the `handleConfidence` function and add a new handler. Find the `return (` in the file and update the `PredictionQuestion` call from:

```tsx
<PredictionQuestion
  data={concept.prediction_question}
  onAnswer={() => setStage("concept")}
  revealed={false}
/>
```

to:

```tsx
<PredictionQuestion
  data={concept.prediction_question}
  onAnswer={() => {
    // Delay 1500ms so the color-coded reveal and explanation are visible
    setTimeout(() => setStage("concept"), 1500)
  }}
  revealed={true}
/>
```

**Step 4: Run Vitest to confirm no regressions**

```bash
cd frontend && npx vitest run
```

Expected: 37+ tests PASS (the new PredictionQuestion tests are now included).

**Step 5: Commit**

```bash
git add frontend/tests/PredictionQuestion.test.tsx \
        frontend/app/learn/[moduleId]/[conceptId]/page.tsx
git commit -m "feat: prediction reveal — show answer feedback before advancing to concept"
```

---

## Task 3: Module progress bar in learn page

**Files:**
- Modify: `frontend/app/learn/[moduleId]/[conceptId]/page.tsx`

No new test needed — this is a rendering detail covered adequately by E2E.

**Step 1: Add progress bar below the AppHeader**

The learn page already queries `module` via `api.getModule(moduleIdNum)`. The progress info is:

```tsx
const concepts = module?.concepts ?? []
const currentIdx = concepts.findIndex((c) => c.id === conceptIdNum)
```

Find the section in `learn/page.tsx` after the AppHeader JSX (around `<div className="register-study min-h-screen px-6 pt-[104px] pb-10">`).

Replace:

```tsx
<div className="register-study min-h-screen px-6 pt-[104px] pb-10">
  <div className="mx-auto max-w-2xl space-y-6">
```

with:

```tsx
<div className="register-study min-h-[100dvh] px-6 pt-[104px] pb-10">
  <div className="mx-auto max-w-2xl space-y-6">

    {/* Module progress bar */}
    {module && (
      <div className="space-y-1">
        <div className="flex gap-1">
          {module.concepts.map((c, i) => (
            <motion.div
              key={c.id}
              layout
              className={`h-[3px] flex-1 clipped-corners-sm transition-colors duration-500 ${
                i < currentIdx
                  ? "bg-zen-plasma"
                  : i === currentIdx
                  ? "bg-zen-gold"
                  : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
          Concept {currentIdx + 1} of {module.concepts.length} · {module.title}
        </p>
      </div>
    )}
```

Note: `currentIdx` is already computed from existing code. Just insert this block above the `AnimatePresence`. Keep the existing `</div></div>` closing structure intact.

**Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

**Step 3: Run Vitest**

```bash
cd frontend && npx vitest run
```

Expected: All tests PASS.

**Step 4: Commit**

```bash
git add frontend/app/learn/[moduleId]/[conceptId]/page.tsx
git commit -m "feat: add module progress bar to learn page"
```

---

## Task 4: Quiz score tracker

**Files:**
- Modify: `frontend/app/quiz/[conceptId]/page.tsx`

**Step 1: Add score state and update handler**

In `quiz/[conceptId]/page.tsx`, add score state after the existing state declarations:

```tsx
const [score, setScore] = useState({ correct: 0, total: 0 })
```

Update `handleAnswer` from:

```tsx
function handleAnswer(selectedIndex: number, correct: boolean) {
  setLastCorrect(correct)
  setPhase("confidence")
}
```

to:

```tsx
function handleAnswer(selectedIndex: number, correct: boolean) {
  setLastCorrect(correct)
  setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
  setPhase("confidence")
}
```

**Step 2: Display score in the progress row**

Find the segmented progress bar row in `quiz/page.tsx`. It currently looks like:

```tsx
<div className="flex items-center justify-between">
  <div className="flex gap-1">
    {questions.map((_, i) => ( ... ))}
  </div>
  <p className="text-xs uppercase tracking-widest text-zinc-600">
    {qIndex + 1} / {questions.length}
  </p>
</div>
```

Replace the `<p>` count with a score display:

```tsx
<div className="flex items-center gap-3">
  {score.total > 0 && (
    <span className="font-mono text-[10px] text-zen-plasma/60 tracking-widest">
      {score.correct}✓ {score.total - score.correct}✗
    </span>
  )}
  <p className="text-xs uppercase tracking-widest text-zinc-600">
    {qIndex + 1} / {questions.length}
  </p>
</div>
```

**Step 3: Store final score in sessionStorage before navigating away**

In `handleConfidence`, update the `isLast` branch from:

```tsx
if (isLast) {
  router.push(`/world-map`)
}
```

to:

```tsx
if (isLast) {
  const finalCorrect = score.correct + (lastCorrect ? 1 : 0)
  sessionStorage.setItem("zenkai-quiz-score", `${finalCorrect}/${questions!.length}`)
  router.push(`/world-map`)
}
```

Note: we add `lastCorrect ? 1 : 0` because the current question's confidence was just submitted but `score` state hasn't updated yet (state updates are async in React).

**Step 4: TypeScript check and Vitest**

```bash
cd frontend && npx tsc --noEmit && npx vitest run
```

Expected: Clean.

**Step 5: Commit**

```bash
git add frontend/app/quiz/[conceptId]/page.tsx
git commit -m "feat: quiz score tracker — running tally + sessionStorage for completion"
```

---

## Task 5: Completion page `/complete/[moduleId]`

**Files:**
- Create: `frontend/app/complete/[moduleId]/page.tsx`
- Create: `frontend/tests/CompletePage.test.tsx`

**Step 1: Write the failing test**

Create `frontend/tests/CompletePage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

// Mock Next.js navigation
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
    if (queryKey[0] === "module") {
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

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Import AFTER mocks
const { default: CompletePage } = await import("@/app/complete/[moduleId]/page")

describe("CompletePage", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

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

  it("shows quiz score if stored in sessionStorage", () => {
    sessionStorage.setItem("zenkai-quiz-score", "5/7")
    render(<CompletePage />)
    expect(screen.getByText(/5\/7/)).toBeInTheDocument()
  })

  it("does not show quiz score section when not stored", () => {
    render(<CompletePage />)
    expect(screen.queryByTestId("quiz-score")).not.toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run tests/CompletePage.test.tsx
```

Expected: FAIL — module `@/app/complete/[moduleId]/page` does not exist.

**Step 3: Create the completion page**

Create `frontend/app/complete/[moduleId]/page.tsx`:

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryKeys"
import { AppHeader } from "@/components/ui/AppHeader"
import { SamuraiButton } from "@/components/ui/SamuraiButton"
import { RoninSprite } from "@/components/ui/RoninSprite"
import { getLocationByModuleId } from "@/lib/worldMapConfig"

export default function CompletePage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const router = useRouter()
  const moduleIdNum = Number(moduleId)

  const [quizScore, setQuizScore] = useState<string | null>(null)
  const [displayXp, setDisplayXp] = useState(0)
  const animatedRef = useRef(false)

  const { data: character } = useQuery({
    queryKey: queryKeys.character(),
    queryFn: api.getCharacter,
  })

  const { data: module } = useQuery({
    queryKey: queryKeys.module(moduleIdNum),
    queryFn: () => api.getModule(moduleIdNum),
  })

  const location = getLocationByModuleId(moduleIdNum)

  // Read quiz score from sessionStorage (set by quiz page if a review was done)
  useEffect(() => {
    const stored = sessionStorage.getItem("zenkai-quiz-score")
    if (stored) {
      setQuizScore(stored)
      sessionStorage.removeItem("zenkai-quiz-score")
    }
  }, [])

  // XP count-up animation
  useEffect(() => {
    if (!character || animatedRef.current) return
    animatedRef.current = true
    const target = character.total_xp
    const duration = 1200
    const startTime = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      setDisplayXp(Math.round(target * progress))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [character])

  function handleReturn() {
    sessionStorage.setItem("zenkai-just-completed", moduleId)
    router.push("/world-map")
  }

  return (
    <div className="fixed inset-0 bg-zen-void flex flex-col select-none">
      <AppHeader />

      <div className="flex flex-col items-center justify-center flex-1 px-6 gap-8">
        {/* Location label */}
        {location && (
          <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
            {location.biome} · {location.name}
          </p>
        )}

        {/* Completion badge */}
        <div className="clipped-corners border border-zen-gold/30 bg-zen-slate px-8 py-5 text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40 mb-2">
            Module Complete
          </p>
          <h1 className="font-heading text-2xl font-bold text-zen-gold leading-tight">
            {module?.title ?? "…"}
          </h1>
          {module && (
            <p className="font-mono text-[10px] text-zen-plasma/50 mt-1">
              {module.concepts.length} concept{module.concepts.length !== 1 ? "s" : ""} studied
            </p>
          )}
        </div>

        {/* Character sprite */}
        <RoninSprite animation="breathing-idle" direction="south" scale={1.2} />

        {/* XP display */}
        <div className="text-center" data-testid="xp-display">
          <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
            Total XP
          </p>
          <p className="font-heading text-3xl font-bold text-zen-gold tabular-nums mt-1">
            {displayXp}
          </p>
        </div>

        {/* Quiz score (only if a review quiz was taken) */}
        <AnimatePresence>
          {quizScore && (
            <motion.div
              data-testid="quiz-score"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-[10px] text-zen-plasma/50 tracking-widest"
            >
              Review score: {quizScore}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Return CTA */}
        <SamuraiButton
          data-testid="return-btn"
          className="w-full max-w-xs"
          onClick={handleReturn}
        >
          Return to World Map
        </SamuraiButton>
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run tests/CompletePage.test.tsx
```

Expected: All 5 tests PASS.

**Step 5: Update learn page to route to completion page**

In `frontend/app/learn/[moduleId]/[conceptId]/page.tsx`, find the `progressMutation` `onSuccess` callback:

```tsx
onSuccess: () => {
  const concepts = module?.concepts ?? []
  const currentIdx = concepts.findIndex((c) => c.id === conceptIdNum)
  const next = concepts[currentIdx + 1]
  if (next) {
    router.push(`/learn/${moduleId}/${next.id}`)
  } else {
    sessionStorage.setItem("zenkai-just-completed", String(moduleIdNum))
    router.push(`/world-map`)
  }
},
```

Replace the `else` branch:

```tsx
  } else {
    router.push(`/complete/${moduleId}`)
  }
```

Note: We removed the `sessionStorage.setItem` here — the completion page now handles setting that flag when the user clicks "Return to World Map".

**Step 6: TypeScript check and Vitest**

```bash
cd frontend && npx tsc --noEmit && npx vitest run
```

Expected: Clean pass on all tests.

**Step 7: Commit**

```bash
git add frontend/app/complete/[moduleId]/page.tsx \
        frontend/tests/CompletePage.test.tsx \
        frontend/app/learn/[moduleId]/[conceptId]/page.tsx
git commit -m "feat: completion page with XP display and return CTA"
```

---

## Task 6: Update E2E tests for new completion flow

**Files:**
- Modify: `e2e/critical-flows.spec.ts`

The existing E2E tests have two flows that break with our changes:
- **Flow 7** expects `waitForURL("/world-map")` on last concept — now routes to `/complete/2`
- **Flow 1** clicks a prediction option and immediately expects the concept card — now there is a 1500ms delay

**Step 1: Update Flow 7**

Find the test `"learn page sets completion flag on last concept"` and replace it entirely:

```typescript
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
```

**Step 2: Update Flow 1 (add timeout for prediction delay)**

Find the test `"learn flow — read a concept end-to-end"`. The prediction click now waits 1500ms before auto-advancing. Update the line after the prediction click:

```typescript
await page.click('[data-testid="prediction-option-0"]') // Answer prediction — 1500ms reveal delay
await expect(page.locator('[data-testid="concept-card"]')).toBeVisible({ timeout: 5000 }) // wait for stage transition
```

The original test already had `await expect(page.locator('[data-testid="concept-card"]')).toBeVisible()` — just add `{ timeout: 5000 }` to that assertion to account for the delay.

**Step 3: Run E2E tests**

Make sure both the backend (port 8000) and frontend (port 3000) are running, then:

```bash
cd /Users/t-rawww/zenkai && npx playwright test e2e/critical-flows.spec.ts --reporter=list
```

Expected: All 7 tests PASS.

**Step 4: Commit**

```bash
git add e2e/critical-flows.spec.ts
git commit -m "test: update E2E flows for prediction reveal delay and completion page routing"
```

---

## Task 7: LocationPanel — loading skeleton + visible dismiss button

**Files:**
- Modify: `frontend/components/ui/LocationPanel.tsx`
- Modify: `frontend/app/world-map/page.tsx`
- Modify: `frontend/tests/LocationPanel.test.tsx`

**Step 1: Write failing tests**

Add to `frontend/tests/LocationPanel.test.tsx` inside the `describe("LocationPanel", ...)` block:

```tsx
it("shows loading skeleton when loading=true", () => {
  render(<LocationPanel location={location} module={unlockedModule} onEnter={() => {}} onDismiss={() => {}} loading={true} />)
  expect(screen.getByTestId("panel-loading")).toBeInTheDocument()
  expect(screen.queryByText(/Enter Dōjō/i)).not.toBeInTheDocument()
})

it("shows dismiss button", () => {
  const onDismiss = vi.fn()
  render(<LocationPanel location={location} module={unlockedModule} onEnter={() => {}} onDismiss={onDismiss} />)
  fireEvent.click(screen.getByTestId("panel-dismiss-btn"))
  expect(onDismiss).toHaveBeenCalledTimes(1)
})
```

**Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run tests/LocationPanel.test.tsx
```

Expected: FAIL — `loading` prop and `panel-dismiss-btn` do not exist.

**Step 3: Update LocationPanel component**

Replace the entire `LocationPanel.tsx` content with:

```tsx
"use client"

import { motion } from "framer-motion"
import { SamuraiButton } from "@/components/ui/SamuraiButton"
import type { WorldMapLocation } from "@/lib/worldMapConfig"

interface PanelModule {
  id: number
  title: string
  is_unlocked: boolean
  quiz_score_achieved: number | null
  order_index: number
  concepts: { id: number }[]
}

interface LocationPanelProps {
  location: WorldMapLocation
  module: PanelModule
  onEnter: () => void
  onDismiss: () => void
  /** When true, shows a loading skeleton instead of module detail */
  loading?: boolean
}

export function LocationPanel({ location, module, onEnter, onDismiss, loading = false }: LocationPanelProps) {
  const totalCount = module.concepts.length
  const isCompleted = module.quiz_score_achieved !== null

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Invisible backdrop for dismiss */}
      <div
        data-testid="panel-backdrop"
        className="absolute inset-0"
        onClick={onDismiss}
      />

      {/* Slide-up panel */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 clipped-corners bg-zen-slate border-t border-zen-plasma/20 px-6 pt-5 pb-10"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Drag handle + dismiss row */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-1 w-10 rounded-full bg-zen-plasma/20 mx-auto" />
          <button
            data-testid="panel-dismiss-btn"
            onClick={onDismiss}
            className="absolute right-4 top-4 clipped-corners-sm px-2 py-1 font-mono text-[10px] text-zen-plasma/40 hover:text-zen-plasma/80 hover:bg-zen-plasma/10 transition-colors"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
          {location.biome}
        </p>
        <h2 className="font-heading text-xl font-bold text-zen-gold mt-0.5">
          {location.name}
        </h2>

        {loading ? (
          <div data-testid="panel-loading" className="mt-4 space-y-3 animate-pulse">
            <div className="h-4 w-48 bg-zinc-700 clipped-corners-sm" />
            <div className="flex gap-1 mt-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-1 flex-1 clipped-corners-sm bg-zinc-700" />
              ))}
            </div>
            <div className="h-10 w-full bg-zinc-800 clipped-corners-sm mt-5" />
          </div>
        ) : (
          <>
            <p className="font-heading text-base text-zinc-300 mt-0.5">{module.title}</p>

            {/* Concept progress bar */}
            {totalCount > 0 && (
              <div className="mt-4">
                <div className="flex gap-1">
                  {Array.from({ length: totalCount }, (_, i) => (
                    <div key={i} className="h-1 flex-1 clipped-corners-sm bg-zinc-700" />
                  ))}
                </div>
                <p className="font-mono text-[9px] text-zen-plasma/40 mt-1">
                  {totalCount} concepts
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="mt-5">
              {module.is_unlocked ? (
                <SamuraiButton className="w-full" onClick={onEnter}>
                  {isCompleted ? "Revisit Dōjō" : "Enter Dōjō"}
                </SamuraiButton>
              ) : (
                <div className="clipped-corners border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-center">
                  <p className="font-mono text-xs text-zinc-600 uppercase tracking-widest">
                    Locked — complete the previous module first
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
```

**Step 4: Update world-map page to show panel immediately on tap**

In `frontend/app/world-map/page.tsx`, the panel is currently gated by `selectedModuleId && selectedModuleDetail && selectedLocation`. Change so it shows immediately:

Find this block in the JSX:

```tsx
{selectedModuleId && selectedModuleDetail && selectedLocation && (
  <LocationPanel
    key={selectedModuleId}
    location={selectedLocation}
    module={selectedModuleDetail}
    onEnter={handleEnterDojo}
    onDismiss={() => { setSelectedModuleId(null); setSelectedModuleDetail(null) }}
  />
)}
```

Replace with:

```tsx
{selectedModuleId && selectedLocation && selectedModuleDetail && (
  <LocationPanel
    key={selectedModuleId}
    location={selectedLocation}
    module={selectedModuleDetail}
    onEnter={handleEnterDojo}
    onDismiss={() => { setSelectedModuleId(null); setSelectedModuleDetail(null) }}
    loading={false}
  />
)}
{selectedModuleId && selectedLocation && !selectedModuleDetail && (
  <LocationPanel
    key={`${selectedModuleId}-loading`}
    location={selectedLocation}
    module={{ id: selectedModuleId, title: "", is_unlocked: false, quiz_score_achieved: null, order_index: 0, concepts: [] }}
    onEnter={() => {}}
    onDismiss={() => { setSelectedModuleId(null); setSelectedModuleDetail(null) }}
    loading={true}
  />
)}
```

**Step 5: Run tests to verify passing**

```bash
cd frontend && npx vitest run tests/LocationPanel.test.tsx
```

Expected: All tests PASS (including the 2 new ones).

**Step 6: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

**Step 7: Commit**

```bash
git add frontend/components/ui/LocationPanel.tsx \
        frontend/app/world-map/page.tsx \
        frontend/tests/LocationPanel.test.tsx
git commit -m "feat: LocationPanel loading skeleton + visible dismiss button"
```

---

## Task 8: Polish — RoninSprite in quiz + `min-h-[100dvh]` on register pages

**Files:**
- Modify: `frontend/app/quiz/[conceptId]/page.tsx`
- Modify: `frontend/app/review/page.tsx`

**Step 1: Replace AssetPlaceholder with RoninSprite in quiz**

In `frontend/app/quiz/[conceptId]/page.tsx`:

Add the missing import at the top:

```tsx
import { RoninSprite } from "@/components/ui/RoninSprite"
```

Remove the `AssetPlaceholder` import line:

```tsx
import { AssetPlaceholder } from "@/components/ui/AssetPlaceholder"
```

Replace:

```tsx
{/* Character placeholder — battle idle */}
<AssetPlaceholder
  label="Battle sprite"
  className="h-24 w-16 shrink-0 self-start"
/>
```

with:

```tsx
{/* Character — fight stance */}
<RoninSprite
  animation="fight-stance-idle-8-frames"
  direction="south"
  scale={0.9}
  className="shrink-0 self-start"
/>
```

**Step 2: Fix `min-h-screen` → `min-h-[100dvh]` on register pages**

In `frontend/app/quiz/[conceptId]/page.tsx`, replace:

```tsx
<div className="register-battle min-h-screen px-6 pt-[104px] pb-10">
```

with:

```tsx
<div className="register-battle min-h-[100dvh] px-6 pt-[104px] pb-10">
```

In `frontend/app/review/page.tsx`, replace:

```tsx
<div className="register-study min-h-screen px-6 pt-[104px] pb-10">
```

with:

```tsx
<div className="register-study min-h-[100dvh] px-6 pt-[104px] pb-10">
```

**Step 3: TypeScript check and full test run**

```bash
cd frontend && npx tsc --noEmit && npx vitest run
```

Expected: Clean.

**Step 4: Commit**

```bash
git add frontend/app/quiz/[conceptId]/page.tsx \
        frontend/app/review/page.tsx
git commit -m "polish: RoninSprite in quiz battle screen, min-h-[100dvh] on register pages"
```

---

## Final Verification

Run the full test suite:

```bash
# Vitest (unit + component)
cd frontend && npx vitest run

# TypeScript
npx tsc --noEmit

# E2E (requires backend + frontend running)
cd /Users/t-rawww/zenkai && npx playwright test e2e/critical-flows.spec.ts --reporter=list
```

Expected:
- Vitest: 42+ tests PASS (37 original + 5 PredictionQuestion + 5 CompletePage + 2 LocationPanel)
- TypeScript: 0 errors
- Playwright: 7/7 E2E tests PASS

Then open a PR: `git push -u origin feat/learn-flow-polish` and create PR on GitHub.
