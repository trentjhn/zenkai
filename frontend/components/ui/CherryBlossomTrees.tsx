"use client"

import { motion } from "framer-motion"

export function CherryBlossomTrees() {
  return (
    <>
      {/* Left tree — pointer-events-auto so hover works, cursor-default so it doesn't feel clickable */}
      <motion.div
        className="fixed top-0 h-screen hidden lg:flex items-end cursor-default"
        style={{ width: "480px", left: "-40px", transformOrigin: "bottom left", marginBottom: "110px" }}
        animate={{ rotate: [-0.3, 0.3, -0.3] }}
        whileHover={{ rotate: 0.8, x: 5, transition: { type: "spring", stiffness: 120, damping: 14 } }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      >
        <img
          src="/assets/trees/cherryblossom.png"
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "auto",
            objectFit: "contain",
            objectPosition: "bottom left",
            opacity: 0.82,
            pointerEvents: "none",
          }}
        />
      </motion.div>

      {/* Right tree hidden for now */}
    </>
  )
}
