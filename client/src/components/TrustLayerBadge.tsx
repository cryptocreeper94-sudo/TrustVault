import { Shield, ExternalLink, Award, Users, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function TrustLayerBadge() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          data-testid="button-trustlayer-badge"
        >
          <div className="w-5 h-5 rounded-md theme-gradient flex items-center justify-center shrink-0">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="text-[11px] font-semibold tracking-wide hidden sm:inline">
            TRUSTLAYER
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 rounded-xl overflow-hidden"
        align="start"
        sideOffset={8}
        data-testid="panel-trustlayer-info"
      >
        <div className="p-1">
          <div className="rounded-lg theme-gradient p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">TrustLayer</h3>
                <p className="text-[11px] text-white/70">Verified Ecosystem Member</p>
              </div>
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed">
              DW Media Studio is part of the TrustLayer ecosystem by Dark Wave Studios — a trust-based engagement platform.
            </p>
          </div>
        </div>

        <div className="p-3 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <Award className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Membership Included</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Subscribing to any paid plan makes you a TrustLayer member with full dashboard access.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Member Dashboard</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Log in at dwtl.io to access your TrustLayer dashboard and membership card.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Membership Card</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Get your digital membership card and ecosystem identity set up at dwtl.io.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 flex flex-col gap-1.5">
            <a
              href="https://dwtl.io"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
              data-testid="link-trustlayer-dashboard"
            >
              <Button variant="outline" size="sm" className="w-full gap-2 justify-start">
                <Shield className="w-3.5 h-3.5" />
                TrustLayer Dashboard
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
            </a>
            <a
              href="https://darkwavestudios.io"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
              data-testid="link-darkwavestudios-badge"
            >
              <Button variant="ghost" size="sm" className="w-full gap-2 justify-start">
                <Award className="w-3.5 h-3.5" />
                Dark Wave Studios
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
            </a>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
