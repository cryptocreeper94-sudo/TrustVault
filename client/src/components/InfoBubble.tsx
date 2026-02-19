import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface InfoBubbleProps {
  text: string;
  side?: "top" | "bottom" | "left" | "right";
  size?: "sm" | "md";
  className?: string;
}

export function InfoBubble({ text, side = "top", size = "sm", className = "" }: InfoBubbleProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-full text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors focus:outline-none ${size === "sm" ? "w-4 h-4" : "w-5 h-5"} ${className}`}
          tabIndex={-1}
          data-testid="info-bubble"
        >
          <HelpCircle className={size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5"} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-[260px] text-xs leading-relaxed bg-[rgba(12,18,36,0.95)] backdrop-blur-xl border-white/10 text-white/80 px-3 py-2.5 rounded-lg shadow-xl"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

interface InfoLabelProps {
  label: string;
  info: string;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  htmlFor?: string;
}

export function InfoLabel({ label, info, side = "top", className = "", htmlFor }: InfoLabelProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <InfoBubble text={info} side={side} />
    </div>
  );
}