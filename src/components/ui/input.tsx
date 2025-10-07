import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // ReadmeUI input-pill padrão
          "input-pill flex h-12 w-full rounded-[30px] border border-white bg-[rgba(217,217,217,0.20)] px-5 py-3 text-base text-white placeholder-white/70 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-4 focus:ring-[rgba(1,137,66,0.25)] focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
