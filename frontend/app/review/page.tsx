"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryKeys"
import { cn } from "@/lib/utils"
import { AppHeader } from "@/components/ui/AppHeader"

export default function ReviewPage() {
  const router = useRouter()

  const { data: queue, isLoading } = useQuery({
    queryKey: queryKeys.reviewQueue(),
    queryFn: api.getReviewQueue,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <AppHeader
        backHref="/world-map"
        backLabel="World Map"
        pageTitle="Review Queue"
      />
    <div className="register-study min-h-screen px-6 pt-[104px] pb-10">
      <div className="mx-auto max-w-2xl space-y-6">

        {!queue || queue.length === 0 ? (
          <div
            className="clipped-corners border border-zinc-800 bg-zen-slate py-12 text-center"
            data-testid="review-empty"
          >
            <p className="text-sm text-zinc-500">No reviews due.</p>
            <p className="mt-1 text-xs text-zinc-700">Come back later — the schedule will surface items when they&apos;re due.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="review-item">
            <p className="text-xs text-zinc-600">{queue.length} item{queue.length !== 1 ? "s" : ""} due</p>
            {queue.map((item, i) => (
              <motion.button
                key={item.concept_id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/quiz/${item.concept_id}`)}
                className="w-full clipped-corners border border-zen-sakura/20 bg-zen-slate px-5 py-4 text-left hover:border-zen-sakura/40 transition-colors"
              >
                <p className="text-sm font-semibold text-zinc-200">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Interval: {item.interval_days.toFixed(1)}d
                </p>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
