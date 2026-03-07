"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface Petal {
  id: number
  x: number
  size: number
  duration: number
  delay: number
  drift: number
  rotation: number
}

export function SakuraPetals({ count = 25 }: { count?: number }) {
  const [petals, setPetals] = useState<Petal[]>([])

  useEffect(() => {
    setPetals(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        size: Math.random() * 8 + 5,
        duration: Math.random() * 8 + 7,
        delay: Math.random() * 10,
        drift: (Math.random() - 0.5) * 120,
        rotation: Math.random() * 720 - 360,
      }))
    )
  }, [count])

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {petals.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: "-20px",
            width: p.size,
            height: p.size * 0.6,
            borderRadius: "50% 0 50% 0",
            backgroundColor: p.id % 2 === 0 ? "#FF9E9E" : "#FFB7C5",
            opacity: 0.7,
            boxShadow: "0 0 4px rgba(255, 150, 180, 0.4)",
          }}
          animate={{
            y: ["0vh", "110vh"],
            x: [0, p.drift],
            rotate: [0, p.rotation],
            opacity: [0, 0.7, 0.7, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  )
}
