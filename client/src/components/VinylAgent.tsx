import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, Trash2, Loader2, Volume2, VolumeX, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import vinylMascot from "../assets/images/vinyl-mascot.png";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
}

interface VinylAgentProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function VinylAgent({ externalOpen, onExternalOpenChange }: VinylAgentProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (open: boolean) => {
    setInternalOpen(open);
    onExternalOpenChange?.(open);
  };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isBouncing, setIsBouncing] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<number | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSpokenIndexRef = useRef<number>(-1);

  useEffect(() => {
    const bounceInterval = setInterval(() => {
      if (!isOpen) {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 1000);
      }
    }, 15000);
    return () => clearInterval(bounceInterval);
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPlayingIndex(null);
  }, []);

  const speakText = useCallback(async (text: string, index: number) => {
    if (playingIndex === index) {
      stopAudio();
      return;
    }
    stopAudio();
    setLoadingAudio(index);
    try {
      const res = await fetch("/api/agent/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlayingIndex(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPlayingIndex(null);
        audioRef.current = null;
      };
      setPlayingIndex(index);
      setLoadingAudio(null);
      await audio.play();
    } catch {
      setLoadingAudio(null);
      setPlayingIndex(null);
    }
  }, [playingIndex, stopAudio]);

  useEffect(() => {
    if (!autoSpeak || isLoading) return;
    const lastMsg = messages[messages.length - 1];
    const lastIndex = messages.length - 1;
    if (lastMsg?.role === "assistant" && lastMsg.content && lastIndex > lastSpokenIndexRef.current) {
      lastSpokenIndexRef.current = lastIndex;
      speakText(lastMsg.content, lastIndex);
    }
  }, [messages, isLoading, autoSpeak, speakText]);

  useEffect(() => {
    return () => { stopAudio(); };
  }, [stopAudio]);

  const startConversation = useCallback(async () => {
    try {
      const res = await apiRequest("POST", "/api/agent/conversations", { title: "Chat with Spinny" });
      const data = await res.json();
      setConversationId(data.id);
      return data.id;
    } catch {
      return null;
    }
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    let activeConversationId = conversationId;
    if (!activeConversationId) {
      activeConversationId = await startConversation();
      if (!activeConversationId) {
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting right now. Try again in a moment!" }]);
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/agent/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter(l => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.content) {
              assistantContent += data.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === "assistant" && !updated[updated.length - 1]?.content) {
          updated[updated.length - 1] = { role: "assistant", content: "Oops, something went wrong. Give it another try!" };
        } else {
          updated.push({ role: "assistant", content: "Oops, something went wrong. Give it another try!" });
        }
        return updated;
      });
    }

    setIsLoading(false);
  };

  const clearChat = async () => {
    if (conversationId) {
      try {
        await apiRequest("DELETE", `/api/agent/conversations/${conversationId}`);
      } catch {}
    }
    setMessages([]);
    setConversationId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-[95] w-full sm:w-[380px] flex flex-col"
          >
            <Card className="h-full rounded-none sm:rounded-l-2xl border-r-0 flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center gap-3 p-4 border-b shrink-0">
                <div className="w-10 h-10 shrink-0">
                  <img
                    src={vinylMascot}
                    alt="Spinny"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-sm">Spinny</h3>
                  <p className="text-xs text-muted-foreground">Your TrustVault Assistant</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAutoSpeak(prev => !prev)}
                    className={`toggle-elevate ${autoSpeak ? "toggle-elevated" : ""}`}
                    data-testid="button-toggle-auto-speak"
                    title={autoSpeak ? "Auto-speak on" : "Auto-speak off"}
                  >
                    {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearChat}
                    disabled={messages.length === 0}
                    data-testid="button-clear-chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    data-testid="button-close-agent"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
                    <div className="w-24 h-24">
                      <img
                        src={vinylMascot}
                        alt="Spinny"
                        className="w-24 h-24 object-contain"
                      />
                    </div>
                    <div className="space-y-2 max-w-[260px]">
                      <h4 className="font-display font-semibold">Hey there!</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        I'm Spinny, your vault assistant. I can help you organize media, find things, or just chat about your collection. What's on your mind?
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {["How do I organize my files?", "What can you help with?", "Tell me about collections"].map(q => (
                        <Button
                          key={q}
                          variant="outline"
                          size="sm"
                          onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 0); }}
                          data-testid={`button-suggestion-${q.slice(0, 10).replace(/\s/g, "-")}`}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 shrink-0 mt-1">
                        <img
                          src={vinylMascot}
                          alt="Spinny"
                          className="w-7 h-7 object-contain"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                        data-testid={`message-${msg.role}-${i}`}
                      >
                        {msg.content || (
                          <div className="flex items-center gap-1.5">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs text-muted-foreground">Thinking...</span>
                          </div>
                        )}
                      </div>
                      {msg.role === "assistant" && msg.content && (
                        <div className="self-start ml-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => speakText(msg.content, i)}
                            disabled={loadingAudio === i}
                            data-testid={`button-speak-${i}`}
                            title={playingIndex === i ? "Stop" : "Listen"}
                          >
                            {loadingAudio === i ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : playingIndex === i ? (
                              <Square className="h-3.5 w-3.5" />
                            ) : (
                              <Volume2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t shrink-0">
                <form
                  onSubmit={e => { e.preventDefault(); sendMessage(); }}
                  className="flex items-center gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Spinny anything..."
                    disabled={isLoading}
                    className="flex-1"
                    data-testid="input-agent-message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || isLoading}
                    data-testid="button-send-message"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
