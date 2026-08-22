"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

/**
 * Toasts are a system readout, not a notification bubble: mono type, hairline
 * border, 4px radius, house easing. Timing is deliberately shorter than the
 * sonner default (4000ms), because these confirm an action the user just took.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      duration={3200}
      gap={8}
      offset={16}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="h-3.5 w-3.5" strokeWidth={1.5} />,
        info: <InfoIcon className="h-3.5 w-3.5" strokeWidth={1.5} />,
        warning: <TriangleAlertIcon className="h-3.5 w-3.5" strokeWidth={1.5} />,
        error: <OctagonXIcon className="h-3.5 w-3.5" strokeWidth={1.5} />,
        loading: <Loader2Icon className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />,
      }}
      toastOptions={{
        style: {
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "4px",
          color: "var(--text-1)",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
        },
        classNames: { toast: "cn-toast" },
      }}
      {...props}
    />
  )
}

export { Toaster }
