import { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "ghost" | "danger"

interface SamuraiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-zen-gold text-zen-void hover:bg-zen-gold/90",
  ghost:   "bg-transparent border border-zen-plasma/40 text-zen-plasma hover:bg-zen-plasma/10",
  danger:  "bg-zen-sakura/20 border border-zen-sakura/50 text-zen-sakura hover:bg-zen-sakura/30",
}

export const SamuraiButton = forwardRef<HTMLButtonElement, SamuraiButtonProps>(
  ({ variant = "primary", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "clipped-corners px-ma py-3 font-heading text-sm font-semibold uppercase tracking-widest transition-all duration-150",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
SamuraiButton.displayName = "SamuraiButton"
