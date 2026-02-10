import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";

const inviteMessage = `Hey Kathy! Jason set you up with your own space on TrustVault — it's a private media vault where you can upload and organize your photos, videos, audio, and documents.

Here's how to get started:

1. Go to: https://trustvault.replit.app/join
2. Tap "Have an invite code?"
3. Enter your invite code: KATHY-TENNIS
4. Pick a display name and create a password (8+ characters, 1 uppercase letter, 1 special character like ! or @)
5. That's it — you're in!

Once you're set up, you can start uploading and organizing your stuff right away. Let me know if you have any questions!`;

export default function InviteMessage() {
  const [copied, setCopied] = useState(false);
  const [, navigate] = useLocation();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = inviteMessage;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <h1 className="text-xl font-semibold text-foreground text-center">Invite Message for Kathy</h1>
        <Card className="p-4">
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
            {inviteMessage}
          </pre>
        </Card>
        <Button
          onClick={handleCopy}
          className="w-full"
          size="lg"
          data-testid="button-copy-invite"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 mr-2" />
              Copy Message
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => navigate("/")}
          data-testid="button-back-home"
        >
          Back to Vault
        </Button>
      </div>
    </div>
  );
}
