"use client"

import { motion } from "framer-motion"
import { useRef, useState } from "react"

const LANTERNS = [
  { cx: 55, cy: 80,  rx: 16, ry: 18, kanji: "力", swayDur: 5.5, swayDelay: 0,   flickerDelay: 0   },
  { cx: 82, cy: 125, rx: 20, ry: 23, kanji: "禅", swayDur: 4.8, swayDelay: 1.1, flickerDelay: 0.8 },
  { cx: 40, cy: 178, rx: 18, ry: 20, kanji: "道", swayDur: 4.2, swayDelay: 2.3, flickerDelay: 1.4 },
]

function LanternItem({ l, i }: { l: typeof LANTERNS[0]; i: number }) {
  const [lit, setLit] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  function handleHoverStart() {
    clearTimeout(timerRef.current)
    setLit(true)
  }

  function handleHoverEnd() {
    timerRef.current = setTimeout(() => setLit(false), 2000)
  }

  return (
    <g transform={`translate(${l.cx}, 0)`}>
      <motion.g
        animate={{ rotate: [-0.7, 0.7, -0.7] }}
        transition={{ duration: l.swayDur, repeat: Infinity, ease: "easeInOut", delay: l.swayDelay }}
        style={{ transformOrigin: "0px 0px" }}
      >
        <g transform={`translate(${-l.cx}, 0)`}>
          <motion.g
            animate={
              lit
                ? { filter: "brightness(1.8) drop-shadow(0 0 22px rgba(255,110,0,1))" }
                : { filter: "brightness(1) drop-shadow(0 0 0px rgba(255,110,0,0))" }
            }
            transition={{ duration: lit ? 0.3 : 1.8, ease: "easeInOut" }}
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
          >
            {/* Cord — extends above viewport so origin is hidden */}
            <line
              x1={l.cx} y1={-200}
              x2={l.cx} y2={l.cy - l.ry - 6}
              stroke="#200808" strokeWidth="1.5" strokeLinecap="round"
              style={{ pointerEvents: "none" }}
            />

            {/* Atmospheric glow — flickering */}
            <motion.ellipse
              cx={l.cx} cy={l.cy}
              rx={l.rx + 42} ry={l.ry + 30}
              fill={`url(#halo-${i})`}
              filter={`url(#blur-${i})`}
              animate={{ opacity: [0.7, 1.0, 0.78, 1.0, 0.68, 0.95, 0.7] }}
              transition={{ duration: 3.5 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: l.flickerDelay }}
              style={{ pointerEvents: "none" }}
            />

            {/* Body */}
            <ellipse cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill={`url(#body-${i})`} />

            {/* Inner highlight */}
            <ellipse cx={l.cx} cy={l.cy} rx={l.rx * 0.87} ry={l.ry * 0.87} fill={`url(#inner-${i})`} />

            {/* Ribs */}
            {Array.from({ length: 8 }, (_, r) => {
              const t     = (r + 1) / 9
              const ribY  = l.cy - l.ry + t * 2 * l.ry
              const tNorm = (ribY - l.cy) / l.ry
              const ribRx = l.rx * Math.sqrt(Math.max(0, 1 - tNorm * tNorm)) * 0.97
              return (
                <ellipse
                  key={r}
                  cx={l.cx} cy={ribY}
                  rx={ribRx} ry={2}
                  fill="none"
                  stroke="rgba(0,0,0,0.32)"
                  strokeWidth="0.9"
                />
              )
            })}

            {/* Top cap */}
            <ellipse cx={l.cx} cy={l.cy - l.ry}     rx={l.rx * 0.43} ry={5}   fill="#0c0303" />
            <ellipse cx={l.cx} cy={l.cy - l.ry - 3}  rx={l.rx * 0.28} ry={3}   fill="#180606" />
            <ellipse cx={l.cx} cy={l.cy - l.ry - 2}  rx={l.rx * 0.30} ry={1.5}
              fill="none" stroke="rgba(180,60,0,0.35)" strokeWidth="0.5" />

            {/* Bottom cap */}
            <ellipse cx={l.cx} cy={l.cy + l.ry}     rx={l.rx * 0.39} ry={5}   fill="#0c0303" />
            <ellipse cx={l.cx} cy={l.cy + l.ry + 2}  rx={l.rx * 0.24} ry={2.5} fill="#180606" />

            {/* Tassel */}
            <line
              x1={l.cx} y1={l.cy + l.ry + 7}
              x2={l.cx} y2={l.cy + l.ry + 18}
              stroke="#5A0000" strokeWidth="1.8" strokeLinecap="round"
            />
            {[-7, -4, -1, 2, 5, 8].map((off, s) => (
              <line
                key={s}
                x1={l.cx + off * 0.35} y1={l.cy + l.ry + 18}
                x2={l.cx + off}        y2={l.cy + l.ry + 30}
                stroke="#7A0000" strokeWidth="0.8"
                strokeLinecap="round" opacity={0.75}
              />
            ))}

            {/* Kanji */}
            <text
              x={l.cx} y={l.cy + 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255, 195, 110, 0.6)"
              fontSize={l.rx * 0.88}
              fontFamily="serif"
              fontWeight="bold"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {l.kanji}
            </text>

          </motion.g>
        </g>
      </motion.g>
    </g>
  )
}

export function JapaneseLanterns() {
  return (
    <div
      className="fixed right-0 top-0 hidden lg:block"
      style={{ width: "120px", height: "340px", cursor: "default" }}
    >
      <svg
        viewBox="0 0 120 340"
        fill="none"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <defs>
          {LANTERNS.map((l, i) => (
            <g key={i}>
              <radialGradient id={`body-${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#FFB05A" />
                <stop offset="22%"  stopColor="#FF5200" />
                <stop offset="52%"  stopColor="#B31200" />
                <stop offset="78%"  stopColor="#660000" />
                <stop offset="100%" stopColor="#1C0000" />
              </radialGradient>
              <radialGradient id={`inner-${i}`} cx="38%" cy="36%" r="55%">
                <stop offset="0%"   stopColor="#FFD080" stopOpacity="0.6" />
                <stop offset="45%"  stopColor="#FF6600" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#FF3300" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`halo-${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#FF4400" stopOpacity="0.4" />
                <stop offset="40%"  stopColor="#CC2200" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#880000" stopOpacity="0" />
              </radialGradient>
              <filter id={`blur-${i}`} x="-150%" y="-150%" width="400%" height="400%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="20" />
              </filter>
            </g>
          ))}
        </defs>

        {LANTERNS.map((l, i) => (
          <LanternItem key={i} l={l} i={i} />
        ))}
      </svg>
    </div>
  )
}
