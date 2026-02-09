import { useTheme } from "@/hooks/use-theme";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function ThemeSwitcher() {
  const { currentTheme, setTheme, themes } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-theme-switcher"
        >
          <Palette className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 glass-morphism">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Color Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className="flex items-center gap-3 cursor-pointer"
            data-testid={`button-theme-${theme.id}`}
          >
            <div
              className="w-5 h-5 rounded-full shrink-0 ring-1 ring-white/10"
              style={{
                background: `linear-gradient(135deg, hsl(${theme.primary}), hsl(${theme.gradientTo}))`,
              }}
            />
            <span className="flex-1 text-sm">{theme.name}</span>
            {currentTheme.id === theme.id && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
