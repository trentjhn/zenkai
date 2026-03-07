"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface TrailPetal {
  id: number
  x: number
  y: number
  size: number
  rotate: number
  driftX: number
  driftY: number
  color: string
}

const PETAL_COLORS = ["#FFB7C5", "#FF9E9E", "#FFCCD5", "#E8A0B4"]

export function CursorEffect() {
  const [pos, setPos] = useState({ x: -200, y: -200 })
  const [petals, setPetals] = useState<TrailPetal[]>([])
  const idRef = useRef(0)
  const lastEmitRef = useRef(0)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      setPos({ x: e.clientX, y: e.clientY })

      // Throttle — emit one petal every 60ms while moving
      const now = Date.now()
      if (now - lastEmitRef.current < 60) return
      lastEmitRef.current = now

      const id = idRef.current++
      setPetals((prev) => [
        ...prev.slice(-25),
        {
          id,
          x: e.clientX,
          y: e.clientY,
          size: Math.random() * 7 + 4,
          rotate: Math.random() * 360,
          driftX: (Math.random() - 0.5) * 50,
          driftY: Math.random() * 40 + 15,
          color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
        },
      ])
    }

    function onClick(e: MouseEvent) {
      // Burst: 10 petals radiate from click point
      const burst: TrailPetal[] = Array.from({ length: 10 }, () => {
        const angle = Math.random() * Math.PI * 2
        const dist = Math.random() * 80 + 30
        return {
          id: idRef.current++,
          x: e.clientX,
          y: e.clientY,
          size: Math.random() * 9 + 5,
          rotate: Math.random() * 360,
          driftX: Math.cos(angle) * dist,
          driftY: Math.sin(angle) * dist,
          color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
        }
      })
      setPetals((prev) => [...prev.slice(-20), ...burst])
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("click", onClick)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("click", onClick)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[999]">
      {/* Custom cursor — gold ring with inner dot */}
      <motion.div
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          transform: "translate(-50%, -50%)",
        }}
        transition={{ type: "spring", stiffness: 800, damping: 40 }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            border: "1.5px solid rgba(224, 175, 104, 0.85)",
            borderRadius: "50%",
            boxShadow: "0 0 8px rgba(224, 175, 104, 0.5), inset 0 0 4px rgba(224, 175, 104, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 3,
              height: 3,
              borderRadius: "50%",
              backgroundColor: "rgba(224, 175, 104, 0.9)",
            }}
          />
        </div>
      </motion.div>

      {/* Petal trail */}
      <AnimatePresence>
        {petals.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              opacity: 0.75,
              scale: 1,
              x: p.x,
              y: p.y,
              rotate: p.rotate,
            }}
            animate={{
              opacity: 0,
              scale: 0.3,
              x: p.x + p.driftX,
              y: p.y + p.driftY,
              rotate: p.rotate + 200,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            onAnimationComplete={() =>
              setPetals((prev) => prev.filter((t) => t.id !== p.id))
            }
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: p.size,
              height: p.size * 0.6,
              borderRadius: "50% 0 50% 0",
              backgroundColor: p.color,
              boxShadow: `0 0 4px ${p.color}88`,
              transformOrigin: "center",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
