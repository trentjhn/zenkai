import type {
  Module,
  ModuleDetail,
  Concept,
  Character,
  ProgressPayload,
  ProgressResponse,
  ReviewItem,
} from "@/lib/types"

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  getModules: () => apiFetch<Module[]>("/modules"),
  getModule: (id: number) => apiFetch<ModuleDetail>(`/modules/${id}`),
  getConcept: (id: number) => apiFetch<Concept>(`/concepts/${id}`),
  getCharacter: () => apiFetch<Character>("/character"),
  getReviewQueue: () => apiFetch<ReviewItem[]>("/progress/review-queue"),
  postProgress: (body: ProgressPayload) =>
    apiFetch<ProgressResponse>("/progress", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  startSession: (moduleId: number) =>
    apiFetch<{ session_id: number }>("/sessions/start", {
      method: "POST",
      body: JSON.stringify({ user_id: 1, module_id: moduleId }),
    }),
  endSession: (sessionId: number) =>
    apiFetch<{ session_id: number; ended: boolean }>(`/sessions/${sessionId}/end`, {
      method: "POST",
    }),
}
