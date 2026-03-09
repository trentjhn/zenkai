"use client"

import { useEffect, useState } from "react"

type Animation = "breathing-idle" | "walking-8-frames" | "fight-stance-idle-8-frames"
type Direction = "south" | "east" | "north" | "west"

const FRAME_COUNTS: Record<Animation, number> = {
  "breathing-idle": 4,
  "walking-8-frames": 8,
  "fight-stance-idle-8-frames": 8,
}

// Breathing is slow and deliberate — ~400ms per frame
// Walking is brisk — ~100ms per frame
const FRAME_INTERVALS: Record<Animation, number> = {
  "breathing-idle": 400,
  "walking-8-frames": 100,
  "fight-stance-idle-8-frames": 120,
}

interface RoninSpriteProps {
  animation?: Animation
  direction?: Direction
  scale?: number
  className?: string
}

export function RoninSprite({
  animation = "breathing-idle",
  direction = "south",
  scale = 3,
  className,
}: RoninSpriteProps) {
  const [frame, setFrame] = useState(0)
  const frameCount = FRAME_COUNTS[animation]
  const interval = FRAME_INTERVALS[animation]

  useEffect(() => {
    setFrame(0)
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % frameCount)
    }, interval)
    return () => clearInterval(id)
  }, [animation, direction, frameCount, interval])

  const framePad = String(frame).padStart(3, "0")
  const src = `/assets/sprites/${animation}/${direction}/frame_${framePad}.png`
  const size = 96 * scale

  return (
    <img
      src={src}
      alt="Ronin sprite"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
      className={className}
      draggable={false}
    />
  )
}
