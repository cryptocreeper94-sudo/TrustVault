import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMediaItems } from "@/hooks/use-media";
import { UploadDialog } from "@/components/UploadDialog";
import { MediaGrid } from "@/components/MediaGrid";
import { MediaViewer } from "@/components/MediaViewer";
import { EditMediaDialog } from "@/components/EditMediaDialog";
import { Button } from "@/components/ui/button";
import { type MediaResponse } from "@shared/routes";
import { type MediaCategory, MEDIA_CATEGORIES } from "@shared/schema";
import {
  Loader2, Plus, LogOut, Shield, Search, Lock, KeyRound, Eye, EyeOff,
  Film, Music, ImageIcon, FileText, File, LayoutGrid, Heart, Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

function getGreeting(): string {
  const now = new Date();
  const centralHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Chicago",
    }).format(now),
    10
  );

  if (centralHour >= 5 && centralHour < 12) return "Good morning";
  if (centralHour >= 12 && centralHour < 17) return "Good afternoon";
  return "Good evening";
}

const FILTER_TABS: { key: string; label: string; icon: any }[] = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "video", label: "Video", icon: Film },
  { key: "audio", label: "Audio", icon: Music },
  { key: "image", label: "Images", icon: ImageIcon },
  { key: "document", label: "Docs", icon: FileText },
  { key: "favorites", label: "Favorites", icon: Heart },
];

export default function Home() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { data: mediaItems, isLoading: mediaLoading } = useMediaItems();
  const [viewingItem, setViewingItem] = useState<MediaResponse | null>(null);
  const [editingItem, setEditingItem] = useState<MediaResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <PinLogin />;
  }

  if (user.mustReset) {
    return <PinReset />;
  }

  let filtered = mediaItems || [];

  if (activeFilter === "favorites") {
    filtered = filtered.filter(m => m.isFavorite);
  } else if (activeFilter !== "all") {
    filtered = filtered.filter(m => m.category === activeFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.label?.toLowerCase().includes(q) ||
      m.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  const greeting = getGreeting();

  const categoryCounts: Record<string, number> = { all: mediaItems?.length || 0, favorites: 0 };
  mediaItems?.forEach(m => {
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
    if (m.isFavorite) categoryCounts.favorites++;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-40 glass-morphism">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          <a
            href="https://darkwavestudios.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 group shrink-0"
            data-testid="link-home"
          >
            <div className="w-8 h-8 rounded-lg theme-gradient flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <h1 className="font-display font-bold text-lg tracking-tight hidden sm:block group-hover:text-primary transition-colors" data-testid="text-app-title">
              Media Vault
            </h1>
          </a>

          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="relative hidden md:block w-56 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-search"
                placeholder="Search files..."
                className="pl-9 bg-white/5 border-white/10 rounded-full h-9 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1 pl-3 border-l border-white/10">
              <span className="text-sm font-medium hidden lg:block text-muted-foreground mr-1" data-testid="text-greeting">
                {greeting}, {user.name}
              </span>
              <ThemeSwitcher />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="button-logout"
                    variant="ghost"
                    size="icon"
                    onClick={() => logout()}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Sign out</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20 sm:pt-24 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-1" data-testid="text-collection-title">
              Your Vault
            </h2>
            <p className="text-sm text-muted-foreground">
              {categoryCounts.all} {categoryCounts.all === 1 ? "file" : "files"} secured
            </p>
          </div>

          <UploadDialog>
            <Button data-testid="button-upload" className="bg-primary text-white shadow-lg shadow-primary/25 rounded-full px-5 gap-2">
              <Plus className="w-4 h-4" />
              Upload
            </Button>
          </UploadDialog>
        </div>

        <div className="mb-5 md:hidden relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-mobile"
            placeholder="Search files..."
            className="pl-9 bg-white/5 border-white/10 rounded-full h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {FILTER_TABS.map(tab => {
            const isActive = activeFilter === tab.key;
            const count = categoryCounts[tab.key] || 0;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium
                  whitespace-nowrap transition-all duration-200 shrink-0
                  ${isActive
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/5"
                  }
                `}
                data-testid={`button-filter-${tab.key}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-0.5 ${isActive ? "bg-white/20" : "bg-white/10"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {mediaLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl overflow-hidden glass-card">
                <div className="aspect-[4/3] shimmer" />
                <div className="p-3 sm:p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded shimmer" />
                  <div className="h-3 w-1/2 rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <MediaGrid
            items={filtered}
            onPlay={setViewingItem}
            onEdit={setEditingItem}
          />
        )}
      </main>

      <div className="fixed bottom-4 right-4 sm:hidden z-30">
        <UploadDialog>
          <Button size="icon" data-testid="button-upload-fab" className="w-14 h-14 rounded-full bg-primary text-white shadow-xl shadow-primary/30">
            <Plus className="w-6 h-6" />
          </Button>
        </UploadDialog>
      </div>

      <MediaViewer
        item={viewingItem}
        open={!!viewingItem}
        onOpenChange={(open) => !open && setViewingItem(null)}
      />

      <EditMediaDialog
        item={editingItem}
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      />
    </div>
  );
}


function PinLogin() {
  const { login, isLoggingIn, loginError } = useAuth();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [shake, setShake] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    try {
      await login(pin);
    } catch (err: any) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setPin("");
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter" && pin.length >= 4) {
        handleSubmit(e as any);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="relative w-full md:w-1/2 lg:w-3/5 h-[40vh] md:h-screen overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-background to-background opacity-80" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen" />

        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-10 bg-gradient-to-t from-black via-transparent to-transparent">
          <div className="max-w-md">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4 leading-tight">
              Your digital assets,<br />
              <span className="theme-gradient-text">
                secured forever.
              </span>
            </h2>
            <p className="text-white/60 text-lg hidden md:block">
              A private vault for your most valuable media and memories.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col items-center justify-center p-8 bg-card border-l border-white/5">
        <div className="max-w-xs w-full space-y-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl theme-gradient flex items-center justify-center mb-6 mx-auto shadow-lg shadow-primary/20">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight mb-1" data-testid="text-login-title">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Enter your PIN to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <div
                className={`flex items-center justify-center gap-2 transition-transform ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-2 transition-all duration-200 ${
                      i < pin.length
                        ? "bg-primary border-primary scale-110"
                        : i < 4
                        ? "border-white/20"
                        : "border-white/10"
                    }`}
                  />
                ))}
              </div>

              {loginError && (
                <p className="text-center text-sm text-destructive" data-testid="text-login-error">
                  Incorrect PIN. Try again.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <Button
                  key={digit}
                  type="button"
                  variant="outline"
                  data-testid={`button-digit-${digit}`}
                  className="h-14 text-xl font-medium border-white/10 bg-white/5"
                  onClick={() => handleDigit(String(digit))}
                  disabled={isLoggingIn}
                >
                  {digit}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                data-testid="button-toggle-pin-visibility"
                className="h-14 border-white/10 bg-white/5"
                onClick={() => setShowPin(!showPin)}
                disabled={isLoggingIn}
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="button-digit-0"
                className="h-14 text-xl font-medium border-white/10 bg-white/5"
                onClick={() => handleDigit("0")}
                disabled={isLoggingIn}
              >
                0
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="button-backspace"
                className="h-14 border-white/10 bg-white/5 text-muted-foreground"
                onClick={handleBackspace}
                disabled={isLoggingIn}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
              </Button>
            </div>

            {showPin && pin.length > 0 && (
              <p className="text-center text-sm text-muted-foreground font-mono tracking-[0.5em]">{pin}</p>
            )}

            <Button
              type="submit"
              data-testid="button-login-submit"
              disabled={pin.length < 4 || isLoggingIn}
              className="w-full h-12 text-base font-medium bg-primary text-white rounded-lg"
            >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Unlock"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}


function PinReset() {
  const { resetPin, isResettingPin, resetPinError } = useAuth();
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"new" | "confirm">("new");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const activePin = step === "new" ? newPin : confirmPin;
  const setActivePin = step === "new" ? setNewPin : setConfirmPin;

  const handleDigit = (digit: string) => {
    if (activePin.length < 8) {
      setActivePin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setActivePin(prev => prev.slice(0, -1));
  };

  const handleContinue = () => {
    if (step === "new") {
      if (newPin.length < 4) return;
      setStep("confirm");
      setError("");
    }
  };

  const handleSubmit = async () => {
    if (newPin !== confirmPin) {
      setError("PINs don't match. Try again.");
      setConfirmPin("");
      return;
    }

    try {
      await resetPin(newPin);
      toast({
        title: "PIN Updated",
        description: "Your new PIN has been set successfully.",
      });
    } catch (err: any) {
      setError(err.message || "Failed to update PIN");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter") {
        if (step === "new" && newPin.length >= 4) {
          handleContinue();
        } else if (step === "confirm" && confirmPin.length >= 4) {
          handleSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [newPin, confirmPin, step]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-xs w-full space-y-8">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl theme-gradient flex items-center justify-center mb-6 mx-auto shadow-lg shadow-primary/20">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight mb-1" data-testid="text-reset-title">
            {step === "new" ? "Set Your New PIN" : "Confirm Your PIN"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === "new"
              ? "Choose a 4-8 digit PIN you'll remember"
              : "Enter the same PIN again to confirm"
            }
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 transition-all duration-200 ${
                    i < activePin.length
                      ? "bg-primary border-primary scale-110"
                      : i < 4
                      ? "border-white/20"
                      : "border-white/10"
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-sm text-destructive" data-testid="text-reset-error">{error}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <Button
                key={digit}
                type="button"
                variant="outline"
                className="h-14 text-xl font-medium border-white/10 bg-white/5"
                onClick={() => handleDigit(String(digit))}
                disabled={isResettingPin}
              >
                {digit}
              </Button>
            ))}
            <div />
            <Button
              type="button"
              variant="outline"
              className="h-14 text-xl font-medium border-white/10 bg-white/5"
              onClick={() => handleDigit("0")}
              disabled={isResettingPin}
            >
              0
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-14 border-white/10 bg-white/5 text-muted-foreground"
              onClick={handleBackspace}
              disabled={isResettingPin}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
            </Button>
          </div>

          {step === "new" ? (
            <Button
              data-testid="button-pin-continue"
              disabled={newPin.length < 4 || isResettingPin}
              className="w-full h-12 text-base font-medium bg-primary text-white rounded-lg"
              onClick={handleContinue}
            >
              Continue
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-12 border-white/10"
                onClick={() => { setStep("new"); setConfirmPin(""); setError(""); }}
                disabled={isResettingPin}
              >
                Back
              </Button>
              <Button
                data-testid="button-pin-confirm"
                disabled={confirmPin.length < 4 || isResettingPin}
                className="flex-1 h-12 text-base font-medium bg-primary text-white rounded-lg"
                onClick={handleSubmit}
              >
                {isResettingPin ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Set PIN"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
