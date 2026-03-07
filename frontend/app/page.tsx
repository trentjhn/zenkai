"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SamuraiButton } from "@/components/ui/SamuraiButton"
import { RoninSprite } from "@/components/ui/RoninSprite"
import { SakuraPetals } from "@/components/ui/EmberParticles"
import { CursorEffect } from "@/components/ui/CursorEffect"
import { CherryBlossomTrees } from "@/components/ui/CherryBlossomTrees"
import { JapaneseLanterns } from "@/components/ui/JapaneseLanterns"

// Each bolt variant is a set of SVG paths — main channel + branches
// Coordinates are in a 40×80 viewBox for tall, thin bolts
const BOLT_VARIANTS = [
  {
    main: "M20 0 L16 12 L19 11 L14 25 L18 23 L11 40 L15 38 L9 55 L13 52 L7 70 L11 67 L6 80",
    b1:   "M14 25 L8 34 L11 33 L6 44",
    b2:   "M11 40 L17 50 L15 54",
  },
  {
    main: "M18 0 L22 10 L18 9 L23 22 L19 20 L24 35 L20 33 L26 50 L22 47 L28 63 L24 60 L28 78",
    b1:   "M23 22 L30 30 L27 29 L32 40",
    b2:   "M24 35 L17 46 L20 45 L15 55",
  },
  {
    main: "M22 0 L17 14 L21 12 L15 27 L19 25 L13 42 L17 40 L12 56 L16 53 L10 72 L14 68 L10 80",
    b1:   "M15 27 L22 36 L19 35 L24 46",
    b2:   "M13 42 L6 52 L9 51",
  },
]

function ElectricBolt({ x, y, rotate, variant = 0 }: { x: string; y: string; rotate: number; variant?: number }) {
  const [visible, setVisible] = useState(false)
  const { main, b1, b2 } = BOLT_VARIANTS[variant % BOLT_VARIANTS.length]
  const filterId = `bolt-glow-${variant}`

  useEffect(() => {
    function flicker() {
      setVisible(true)
      setTimeout(() => setVisible(false), Math.random() * 120 + 60)
      setTimeout(flicker, Math.random() * 2800 + 1200)
    }
    const t = setTimeout(flicker, Math.random() * 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.svg
          key="bolt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.04 }}
          style={{ position: "absolute", left: x, top: y, rotate, transformOrigin: "top center", pointerEvents: "none" }}
          width="40"
          height="80"
          viewBox="0 0 40 80"
          fill="none"
          overflow="visible"
        >
          <defs>
            <filter id={filterId} x="-100%" y="-20%" width="300%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Outer glow layer */}
          <path d={main} stroke="#4FC3F7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={0.35} filter={`url(#${filterId})`} />
          <path d={b1}   stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={0.25} filter={`url(#${filterId})`} />
          <path d={b2}   stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={0.2}  filter={`url(#${filterId})`} />
          {/* Mid-blue channel */}
          <path d={main} stroke="#81D4FA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
          <path d={b1}   stroke="#81D4FA" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
          <path d={b2}   stroke="#81D4FA" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
          {/* White-hot core */}
          <path d={main} stroke="rgba(255,255,255,0.9)" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={b1}   stroke="rgba(255,255,255,0.7)" strokeWidth="0.4" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      )}
    </AnimatePresence>
  )
}

export default function Home() {
  const router = useRouter()
  const [isTransitioning, setIsTransitioning] = useState(false)

  function enterWorldMap() {
    setIsTransitioning(true)
    setTimeout(() => router.push("/world-map"), 750)
  }

  return (
    <main className="min-h-screen bg-zen-void flex flex-col items-center justify-center gap-10 p-8 relative overflow-hidden cursor-none select-none">

      {/* World-map transition overlay — ink-wash portal */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-zen-void pointer-events-none"
            initial={{ clipPath: "circle(0% at 50% 80%)" }}
            animate={{ clipPath: "circle(160% at 50% 80%)" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          />
        )}
      </AnimatePresence>

      {/* Cherry blossom trees — left flank */}
      <CherryBlossomTrees />

      {/* Japanese lanterns — right flank */}
      <JapaneseLanterns />

      {/* Falling sakura petals */}
      <SakuraPetals count={28} />

      {/* Cursor effect — gold ring + petal trail */}
      <CursorEffect />

      {/* Ambient radial glow behind the title */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "200px",
          background: "radial-gradient(ellipse, rgba(224,175,104,0.08) 0%, transparent 70%)",
        }}
      />

      {/* SF2-style ZENKAI title */}
      <div className="relative flex flex-col items-center gap-2 select-none">
        <p className="font-mono text-xs tracking-[0.4em] text-zen-plasma/60 uppercase">
          Personal AI Learning System
        </p>

        <div className="relative">
          {/* Electric lightning bolts */}
          <ElectricBolt x="-44px" y="4px" rotate={-12} variant={0} />
          <ElectricBolt x="100%" y="6px" rotate={18} variant={1} />
          <ElectricBolt x="22%" y="-30px" rotate={-4} variant={2} />

          <motion.h1
            className="font-heading font-black uppercase tracking-tight"
            style={{
              fontSize: "clamp(4rem, 10vw, 7rem)",
              background: "linear-gradient(180deg, #FFE066 0%, #E0AF68 40%, #B8860B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "none",
              filter: "drop-shadow(0 0 12px rgba(224,175,104,0.5)) drop-shadow(2px 3px 0px rgba(0,0,0,0.8))",
            }}
            animate={{
              filter: [
                "drop-shadow(0 0 12px rgba(224,175,104,0.4)) drop-shadow(2px 3px 0px rgba(0,0,0,0.8))",
                "drop-shadow(0 0 24px rgba(224,175,104,0.9)) drop-shadow(2px 3px 0px rgba(0,0,0,0.8))",
                "drop-shadow(0 0 12px rgba(224,175,104,0.4)) drop-shadow(2px 3px 0px rgba(0,0,0,0.8))",
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            ZENKAI
          </motion.h1>
        </div>

        <p className="font-mono text-zen-plasma/60 text-xs tracking-[0.3em] uppercase">
          Challenge · Struggle · Recovery · Mastery
        </p>
      </div>

      {/* Main layout: Ronin left — card center — decorative right */}
      <div className="flex items-end gap-8 w-full max-w-3xl">

        {/* Left: Ronin sprite, larger */}
        <div className="hidden md:flex flex-col items-center gap-2 shrink-0 pb-2">
          <RoninSprite animation="breathing-idle" direction="south" scale={4} />
        </div>

        {/* Center: card */}
        <div className="clipped-corners bg-zen-slate border border-zen-plasma/20 flex-1 overflow-hidden">

          {/* Portrait header */}
          <div className="relative h-52 overflow-hidden">
            <img
              src="/assets/portraits/ronin_form1.jpg"
              alt="Ronin Form 1"
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 18%",
              }}
            />
            {/* Fade into card background */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, transparent 30%, #24283B 100%)",
              }}
            />
            {/* Form label overlaid on portrait */}
            <div className="absolute bottom-4 left-6">
              <p className="font-mono text-[9px] text-zen-plasma/50 uppercase tracking-widest">Current Form</p>
              <p className="font-heading text-zen-gold text-2xl font-semibold drop-shadow-lg">浪人 Ronin</p>
            </div>
          </div>

          <div className="px-8 pb-8 space-y-6">

          {/* Mobile-only sprite */}
          <div className="flex md:hidden items-center gap-3 -mt-2">
            <RoninSprite animation="breathing-idle" direction="south" scale={2} />
            <p className="font-body text-zen-plasma/50 text-xs">The path begins.</p>
          </div>

          {/* Desktop subtitle */}
          <p className="hidden md:block font-body text-zen-plasma/50 text-xs -mt-2">
            The path begins. Module 0 unlocked.
          </p>

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
            <SamuraiButton className="flex-[2]" onClick={enterWorldMap} disabled={isTransitioning}>
              Enter World Map
            </SamuraiButton>
            <a href="/review" className="flex-1">
              <SamuraiButton variant="ghost" className="w-full">Review</SamuraiButton>
            </a>
          </div>

          </div>{/* end px-8 pb-8 */}
        </div>

        {/* Right: decorative vertical panel */}
        <div className="hidden md:flex flex-col items-center gap-3 shrink-0 pb-4">
          {/* Animated vertical line */}
          <motion.div
            className="w-px bg-gradient-to-b from-transparent via-zen-plasma/40 to-transparent"
            style={{ height: "180px" }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Japanese glyphs */}
          <div className="flex flex-col items-center gap-2">
            {["禅", "改", "道", "力"].map((kanji, i) => (
              <motion.p
                key={kanji}
                className="font-heading text-base text-zen-plasma/40"
                animate={{ opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
              >
                {kanji}
              </motion.p>
            ))}
          </div>
          <motion.div
            className="w-px bg-gradient-to-b from-transparent via-zen-plasma/40 to-transparent"
            style={{ height: "80px" }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

      </div>
    </main>
  )
}
