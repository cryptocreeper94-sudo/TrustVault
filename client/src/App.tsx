import { Switch, Route, useLocation } from "wouter";
import { Component, type ErrorInfo, type ReactNode, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { AnimatePresence, motion } from "framer-motion";
import { ConfettiProvider } from "@/components/Confetti";
import Home from "@/pages/Home";
import UserDashboard from "@/pages/UserDashboard";
import Explorer from "@/pages/Explorer";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

const ImageEditor = lazy(() => import("@/pages/ImageEditor"));
const AudioEditor = lazy(() => import("@/pages/AudioEditor"));
const VideoEditor = lazy(() => import("@/pages/VideoEditor"));
const MergeEditor = lazy(() => import("@/pages/MergeEditor"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPostPage = lazy(() => import("@/pages/BlogPost"));
const BlogAdmin = lazy(() => import("@/pages/BlogAdmin"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Invite = lazy(() => import("@/pages/Invite"));
const Join = lazy(() => import("@/pages/Join"));
const Admin = lazy(() => import("@/pages/Admin"));
const DeveloperExplorer = lazy(() => import("@/pages/DeveloperExplorer"));
const Roadmap = lazy(() => import("@/pages/Roadmap"));
const InviteMessage = lazy(() => import("@/pages/InviteMessage"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const SmsOptIn = lazy(() => import("@/pages/SmsOptIn"));
const SocialMediaKit = lazy(() => import("@/pages/SocialMediaKit"));
const AudioVisualizer = lazy(() => import("@/pages/AudioVisualizer"));
const BeatSyncVideo = lazy(() => import("@/pages/BeatSyncVideo"));
const ThumbnailRanker = lazy(() => import("@/pages/ThumbnailRanker"));
const PortfolioGenerator = lazy(() => import("@/pages/PortfolioGenerator"));
const StyleDNA = lazy(() => import("@/pages/StyleDNA"));
const SignalChatPanel = lazy(() => import("@/components/SignalChatPanel").then(m => ({ default: m.SignalChatPanel })));

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const dismiss = (window as any).__dismissSplash;
    if (dismiss) dismiss();
    try {
      fetch("/api/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error?.message,
          stack: error?.stack?.slice(0, 2000),
          componentStack: info?.componentStack?.slice(0, 2000),
        }),
      }).catch(() => {});
    } catch {}
  }

  handleReload = () => {
    if ("caches" in window) {
      caches.keys().then((names) => {
        for (const name of names) caches.delete(name);
      });
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    setTimeout(() => window.location.reload(), 300);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "#0a0a0f",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          padding: "24px",
          textAlign: "center",
          fontFamily: "Outfit, system-ui, sans-serif",
        }}>
          <div style={{ color: "#a78bfa", fontSize: "48px" }} data-testid="icon-error-boundary">
            &#x21bb;
          </div>
          <h1
            style={{ fontSize: "24px", fontWeight: "bold", color: "#ffffff", margin: 0 }}
            data-testid="text-error-title"
          >
            Something went wrong
          </h1>
          <p style={{ color: "#a1a1aa", maxWidth: "400px", margin: 0, fontSize: "14px" }} data-testid="text-error-message">
            The app ran into an issue. This can happen after an update. Tap below to clear the cache and reload.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: "#7c3aed",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Outfit, system-ui, sans-serif",
            }}
            data-testid="button-error-reload"
          >
            Clear Cache and Reload
          </button>
          <details style={{ color: "#52525b", fontSize: "11px", maxWidth: "350px", wordBreak: "break-all" }}>
            <summary style={{ cursor: "pointer" }}>Technical details</summary>
            <p style={{ marginTop: "8px" }}>{this.state.errorMessage}</p>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  const [location] = useLocation();
  return (
    <Suspense fallback={<LazyFallback />}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex-1"
        >
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/explore" component={Explorer} />
            <Route path="/dashboard" component={Explorer} />
            <Route path="/developer" component={DeveloperExplorer} />
            <Route path="/vault" component={Home} />
            <Route path="/editor/image/:id" component={ImageEditor} />
            <Route path="/editor/audio/:id" component={AudioEditor} />
            <Route path="/editor/video/:id" component={VideoEditor} />
            <Route path="/merge" component={MergeEditor} />
            <Route path="/blog" component={Blog} />
            <Route path="/blog/admin" component={BlogAdmin} />
            <Route path="/blog/:slug" component={BlogPostPage} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/invite" component={Invite} />
            <Route path="/invite-message" component={InviteMessage} />
            <Route path="/join" component={Join} />
            <Route path="/admin" component={Admin} />
            <Route path="/roadmap" component={Roadmap} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
            <Route path="/sms-optin" component={SmsOptIn} />
            <Route path="/social-media-kit" component={SocialMediaKit} />
            <Route path="/audio-visualizer" component={AudioVisualizer} />
            <Route path="/beat-sync" component={BeatSyncVideo} />
            <Route path="/thumbnail-ranker" component={ThumbnailRanker} />
            <Route path="/portfolio-generator" component={PortfolioGenerator} />
            <Route path="/style-dna" component={StyleDNA} />
            <Route component={NotFound} />
          </Switch>
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider>
              <ConfettiProvider>
                <Router />
                <Suspense fallback={null}>
                  <SignalChatPanel />
                </Suspense>
                <Toaster />
              </ConfettiProvider>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
