import { Switch, Route, useLocation } from "wouter";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { AnimatePresence, motion } from "framer-motion";
import Home from "@/pages/Home";
import ImageEditor from "@/pages/ImageEditor";
import AudioEditor from "@/pages/AudioEditor";
import VideoEditor from "@/pages/VideoEditor";
import MergeEditor from "@/pages/MergeEditor";
import Blog from "@/pages/Blog";
import BlogPostPage from "@/pages/BlogPost";
import BlogAdmin from "@/pages/BlogAdmin";
import Pricing from "@/pages/Pricing";
import Invite from "@/pages/Invite";
import Join from "@/pages/Join";
import Admin from "@/pages/Admin";
import Roadmap from "@/pages/Roadmap";
import InviteMessage from "@/pages/InviteMessage";
import { SignalChatPanel } from "@/components/SignalChatPanel";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidError(_: Error, __: ErrorInfo) {}

  componentDidCatch(_: Error, __: ErrorInfo) {
    const dismiss = (window as any).__dismissSplash;
    if (dismiss) dismiss();
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
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="text-6xl text-violet-400" data-testid="icon-error-boundary">
            <RefreshCw className="w-16 h-16 mx-auto" />
          </div>
          <h1
            className="text-2xl font-bold text-white font-[Outfit]"
            data-testid="text-error-title"
          >
            Something went wrong
          </h1>
          <p className="text-zinc-400 max-w-md" data-testid="text-error-message">
            The app ran into an issue. This can happen after an update. Tap below to clear the cache and reload.
          </p>
          <Button
            onClick={this.handleReload}
            className="bg-violet-600 text-white px-6"
            data-testid="button-error-reload"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear Cache and Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  const [location] = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="flex-1"
      >
        <Switch>
          <Route path="/" component={Home} />
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
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider>
              <Router />
              <SignalChatPanel />
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
