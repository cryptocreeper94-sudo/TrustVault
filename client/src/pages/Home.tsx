import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useVideos } from "@/hooks/use-videos";
import { CreateVideoDialog } from "@/components/CreateVideoDialog";
import { VideoGrid } from "@/components/VideoGrid";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { Button } from "@/components/ui/button";
import { VideoResponse } from "@shared/routes";
import { Loader2, Plus, LogOut, Music2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

export default function Home() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { data: videos, isLoading: videosLoading } = useVideos();
  const [playingVideo, setPlayingVideo] = useState<VideoResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // If not logged in, show the Landing Page UI
  if (!user) {
    return <LandingPage />;
  }

  // Filter videos client-side for simplicity
  const filteredVideos = videos?.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center">
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-display font-bold text-xl tracking-tight hidden sm:block">
              Concert Memories
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search videos..." 
                className="pl-9 bg-white/5 border-white/10 rounded-full h-9 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <span className="text-sm font-medium hidden sm:block text-muted-foreground">
                Hi, {user.firstName || 'Music Lover'}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => logout()}
                className="text-muted-foreground hover:text-white"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-display font-bold text-white mb-2">Your Collection</h2>
            <p className="text-muted-foreground">Relive your favorite live music moments.</p>
          </div>
          
          <CreateVideoDialog>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-full px-6">
              <Plus className="w-5 h-5 mr-2" />
              Upload Video
            </Button>
          </CreateVideoDialog>
        </div>

        {/* Mobile Search Bar */}
        <div className="mb-8 md:hidden relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search videos..." 
            className="pl-9 bg-white/5 border-white/10 rounded-full h-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {videosLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card/40 border border-white/5 rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : (
          <VideoGrid 
            videos={filteredVideos} 
            onPlay={setPlayingVideo}
          />
        )}
      </main>

      <VideoPlayerModal 
        video={playingVideo} 
        open={!!playingVideo} 
        onOpenChange={(open) => !open && setPlayingVideo(null)} 
      />
    </div>
  );
}

function LandingPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Panel - Hero Visual */}
      <div className="relative w-full md:w-1/2 lg:w-3/5 h-[40vh] md:h-screen overflow-hidden bg-black">
        {/* Abstract Background Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-background to-background opacity-80" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen" />

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-10 bg-gradient-to-t from-black via-transparent to-transparent">
          <div className="max-w-md">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4 leading-tight">
              Every concert,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-300">
                relived forever.
              </span>
            </h2>
            <p className="text-white/60 text-lg hidden md:block">
              A private vault for your most cherished live music memories. Secure, beautiful, and accessible anywhere.
            </p>
          </div>
        </div>

        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      </div>

      {/* Right Panel - Login */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col items-center justify-center p-8 bg-card border-l border-white/5">
        <div className="max-w-sm w-full space-y-8">
          <div className="text-center md:text-left">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center mb-6 mx-auto md:mx-0 shadow-lg shadow-primary/20">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to access your private video collection.</p>
          </div>

          <div className="space-y-4 pt-4">
            <Button 
              size="lg" 
              className="w-full h-12 text-base font-medium bg-white text-black hover:bg-white/90 transition-colors"
              onClick={handleLogin}
            >
              Log in with Replit
            </Button>
            
            <p className="text-xs text-center text-muted-foreground pt-4">
              By logging in, you agree to keep the vibes immaculate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
