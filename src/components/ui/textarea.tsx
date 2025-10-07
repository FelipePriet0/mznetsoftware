import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // ReadmeUI input-pill aplicado ao textarea
          "min-h-[100px] w-full rounded-[30px] border border-white bg-[rgba(217,217,217,0.20)] px-5 py-3 text-sm text-white placeholder-white/70 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-4 focus:ring-[rgba(1,137,66,0.25)] focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
