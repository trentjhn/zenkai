export const queryKeys = {
  modules: () => ["modules"] as const,
  module: (id: number) => ["modules", id] as const,
  concept: (id: number) => ["concepts", id] as const,
  character: () => ["character"] as const,
  reviewQueue: () => ["progress", "review-queue"] as const,
} as const
