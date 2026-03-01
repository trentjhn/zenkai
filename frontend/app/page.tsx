"use client"

import Link from "next/link"
import { SamuraiButton } from "@/components/ui/SamuraiButton"

export default function Home() {
  return (
    <main className="min-h-screen bg-zen-void flex flex-col items-center justify-center gap-12 p-8">

      {/* Header */}
      <div className="text-center space-y-3">
        <p className="font-mono text-xs tracking-[0.4em] text-zen-plasma/60 uppercase">
          Personal AI Learning System
        </p>
        <h1 className="font-heading text-6xl font-bold text-zen-gold tracking-tight">
          ZENKAI
        </h1>
        <p className="font-body text-zen-plasma/70 text-sm tracking-widest uppercase">
          Challenge · Struggle · Recovery · Mastery
        </p>
      </div>

      {/* Preview card */}
      <div className="clipped-corners bg-zen-slate border border-zen-plasma/20 p-8 w-full max-w-md space-y-6">
        <div className="space-y-1">
          <p className="font-mono text-[10px] text-zen-plasma/40 uppercase tracking-widest">
            Current Form
          </p>
          <p className="font-heading text-zen-gold text-xl font-semibold">
            浪人 Ronin
          </p>
          <p className="font-body text-zen-plasma/60 text-xs">
            The path begins. Module 0 unlocked.
          </p>
        </div>

        <div className="h-px bg-zen-plasma/10" />

        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: "XP", value: "0" },
            { label: "Streak", value: "0d" },
            { label: "Modules", value: "0/10" },
          ].map(({ label, value }) => (
            <div key={label} className="clipped-corners-sm bg-zen-void p-3">
              <p className="font-heading text-lg font-bold text-zen-gold">{value}</p>
              <p className="font-mono text-[9px] text-zen-plasma/40 uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link href="/world-map" className="flex-1">
            <SamuraiButton className="w-full">Enter World Map</SamuraiButton>
          </Link>
          <Link href="/review" className="flex-1">
            <SamuraiButton variant="ghost" className="w-full">Review</SamuraiButton>
          </Link>
        </div>
      </div>

      {/* Color palette strip — visual design system check */}
      <div className="flex gap-2">
        {[
          { name: "gold",   bg: "bg-zen-gold" },
          { name: "plasma", bg: "bg-zen-plasma" },
          { name: "sakura", bg: "bg-zen-sakura" },
          { name: "teal",   bg: "bg-zen-teal" },
          { name: "purple", bg: "bg-zen-purple" },
          { name: "slate",  bg: "bg-zen-slate" },
        ].map(({ name, bg }) => (
          <div key={name} className="flex flex-col items-center gap-1">
            <div className={`clipped-corners-sm w-8 h-8 ${bg}`} />
            <span className="font-mono text-[8px] text-zen-plasma/30">{name}</span>
          </div>
        ))}
      </div>

    </main>
  )
}
