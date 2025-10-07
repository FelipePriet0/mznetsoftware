import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // CTA padrão ReadmeUI: fundo branco, texto verde, raio 41px
        default:
          "rounded-[41px] bg-white text-[#018942] hover:-translate-y-0.5 hover:shadow-[0_10px_18px_rgba(0,0,0,0.25)] focus-visible:outline-[3px] focus-visible:outline-[rgba(255,255,255,0.60)] focus-visible:outline-offset-2",
        destructive:
          "rounded-[41px] bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "rounded-[41px] border border-white text-white hover:bg-[rgba(255,255,255,0.12)]",
        secondary:
          "rounded-[41px] bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "rounded-[41px] hover:bg-[rgba(255,255,255,0.12)] text-white",
        link: "text-white underline-offset-4 hover:underline",
        pill: "rounded-full bg-white text-[#018942] hover:-translate-y-0.5 hover:shadow-[0_10px_18px_rgba(0,0,0,0.25)]",
      },
      size: {
        default: "h-12 px-5 py-3 text-base",
        sm: "h-10 rounded-[30px] px-4 text-sm",
        lg: "h-12 rounded-[41px] px-8 text-base",
        xl: "h-14 rounded-[41px] px-8 text-base",
        icon: "h-12 w-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "lg",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
