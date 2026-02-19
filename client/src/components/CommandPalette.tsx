import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutGrid, Film, Music, ImageIcon, FileText, Search,
  Palette, Shield, Globe, CreditCard, BookOpen, MessageSquare,
  Monitor, Sparkles, Upload, FolderPlus, Layers, HelpCircle,
  KeyRound, LogOut, Settings, Home, Scissors, Wand2, ListMusic,
  Zap, Activity,
} from "lucide-react";
import type { MediaResponse } from "@shared/routes";

interface CommandPaletteProps {
  onNavigate?: (path: string) => void;
  onAction?: (action: string) => void;
  user?: { name: string; isAdmin?: boolean } | null;
}

interface NavItem {
  label: string;
  path: string;
  icon: any;
  shortcut?: string;
  adminOnly?: boolean;
}

const PAGES: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: Home, shortcut: "D" },
  { label: "Media Vault", path: "/vault", icon: LayoutGrid, shortcut: "V" },
  { label: "Blog", path: "/blog", icon: Globe },
  { label: "Pricing & Plans", path: "/pricing", icon: CreditCard },
  { label: "Community Voice", path: "/roadmap", icon: MessageSquare },
  { label: "Blog Manager", path: "/blog/admin", icon: BookOpen },
  { label: "Command Center", path: "/command-center", icon: Shield, adminOnly: true },
  { label: "Developer Portal", path: "/admin", icon: Settings, adminOnly: true },
  { label: "Privacy Policy", path: "/privacy", icon: Shield },
  { label: "Terms of Service", path: "/terms", icon: FileText },
];

interface ActionItem {
  label: string;
  action: string;
  icon: any;
  shortcut?: string;
}

const ACTIONS: ActionItem[] = [
  { label: "Upload Files", action: "upload", icon: Upload, shortcut: "U" },
  { label: "New Collection", action: "new-collection", icon: FolderPlus },
  { label: "Create Mix / Merge", action: "merge", icon: Layers },
  { label: "Open Spinny AI", action: "spinny", icon: Sparkles },
  { label: "Ambient Mode", action: "ambient", icon: Monitor },
  { label: "Playlists", action: "playlists", icon: ListMusic },
  { label: "Change Theme", action: "theme", icon: Palette },
  { label: "Help Guide", action: "help", icon: HelpCircle },
  { label: "Change Password", action: "change-password", icon: KeyRound },
  { label: "Activity Feed", action: "activity", icon: Activity },
  { label: "Sign Out", action: "logout", icon: LogOut },
];

const CATEGORY_ICONS: Record<string, any> = {
  video: Film,
  audio: Music,
  image: ImageIcon,
  document: FileText,
};

export function CommandPalette({ onNavigate, onAction, user }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: mediaItems } = useQuery<MediaResponse[]>({
    queryKey: ["/api/media"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handlePageSelect = useCallback((path: string) => {
    setOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  }, [navigate, onNavigate]);

  const handleActionSelect = useCallback((action: string) => {
    setOpen(false);
    if (action === "merge") {
      navigate("/merge");
      return;
    }
    onAction?.(action);
  }, [navigate, onAction]);

  const handleMediaSelect = useCallback((item: MediaResponse) => {
    setOpen(false);
    const cat = item.category;
    if (cat === "image" || cat === "audio" || cat === "video") {
      navigate(`/editor/${cat}/${item.id}`);
    } else {
      onAction?.(`view-media-${item.id}`);
    }
  }, [navigate, onAction]);

  const filteredPages = useMemo(() => {
    return PAGES.filter(p => !p.adminOnly || user?.isAdmin);
  }, [user?.isAdmin]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search files, pages, and actions..." data-testid="input-command-palette" />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          {ACTIONS.map((action) => (
            <CommandItem
              key={action.action}
              value={`action-${action.label}`}
              onSelect={() => handleActionSelect(action.action)}
              data-testid={`command-action-${action.action}`}
            >
              <action.icon className="w-4 h-4 text-muted-foreground" />
              <span>{action.label}</span>
              {action.shortcut && (
                <CommandShortcut>{action.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {filteredPages.map((page) => (
            <CommandItem
              key={page.path}
              value={`page-${page.label}`}
              onSelect={() => handlePageSelect(page.path)}
              data-testid={`command-page-${page.path}`}
            >
              <page.icon className="w-4 h-4 text-muted-foreground" />
              <span>{page.label}</span>
              {page.shortcut && (
                <CommandShortcut>{page.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        {mediaItems && mediaItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Files">
              {mediaItems.slice(0, 8).map((item) => {
                const Icon = CATEGORY_ICONS[item.category] || FileText;
                return (
                  <CommandItem
                    key={item.id}
                    value={`file-${item.title}-${item.id}`}
                    onSelect={() => handleMediaSelect(item)}
                    data-testid={`command-file-${item.id}`}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{item.category}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
