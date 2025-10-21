"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/utils/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn(
      "relative flex touch-none select-none items-center",
      orientation === "vertical" ? "h-full w-2 flex-col" : "w-full",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className={cn(
      "relative grow overflow-hidden rounded-full bg-secondary",
      orientation === "vertical" ? "w-2 h-full" : "h-2 w-full"
    )}>
      <SliderPrimitive.Range className={cn(
        "absolute bg-primary",
        orientation === "vertical" ? "w-full" : "h-full"
      )} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-7 w-6 rounded-sm bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 border border-slate-400 shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 hover:from-slate-200 hover:via-slate-100 hover:to-slate-300 active:shadow-sm relative before:absolute before:inset-1 before:rounded-[1px] before:bg-gradient-to-b before:from-white/40 before:to-transparent" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

