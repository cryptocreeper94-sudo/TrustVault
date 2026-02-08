import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full" />
        <AlertTriangle className="h-24 w-24 text-primary relative z-10 mb-6" />
      </div>
      
      <h1 className="text-4xl font-display font-bold mb-4 text-center">404 Page Not Found</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        Looks like this track skipped a beat. The page you're looking for doesn't exist or has been moved.
      </p>

      <Link href="/">
        <Button size="lg" className="bg-primary hover:bg-primary/90 text-white">
          Back to Home
        </Button>
      </Link>
    </div>
  );
}
