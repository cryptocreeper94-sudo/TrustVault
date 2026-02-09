import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import Home from "@/pages/Home";
import ImageEditor from "@/pages/ImageEditor";
import AudioEditor from "@/pages/AudioEditor";
import VideoEditor from "@/pages/VideoEditor";
import MergeEditor from "@/pages/MergeEditor";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/editor/image/:id" component={ImageEditor} />
      <Route path="/editor/audio/:id" component={AudioEditor} />
      <Route path="/editor/video/:id" component={VideoEditor} />
      <Route path="/merge" component={MergeEditor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
