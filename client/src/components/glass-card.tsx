import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-[rgba(12,18,36,0.65)] backdrop-blur-2xl border border-white/[0.08] rounded-xl shadow-2xl transition-all duration-300",
          glow && "hover:border-cyan-500/30 hover:shadow-[0_0_40px_rgba(0,255,255,0.08)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
