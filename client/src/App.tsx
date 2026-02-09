import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
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
import { SignalChatPanel } from "@/components/SignalChatPanel";
import NotFound from "@/pages/not-found";

function Router() {
  return (
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
      <Route path="/join" component={Join} />
      <Route path="/admin" component={Admin} />
      <Route path="/roadmap" component={Roadmap} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
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
  );
}

export default App;
