import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Hash, Send, Users, MessageSquare, Reply,
  X, LogIn, UserPlus, Loader2, Circle, LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TL_TOKEN_KEY = "tl-sso-token";
const TL_USER_KEY = "tl-sso-user";

interface ChatUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarColor: string;
  role: string;
  trustLayerId: string | null;
}

interface ChatChannel {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isDefault: boolean;
}

interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  avatarColor: string;
  role: string;
  displayName: string;
  content: string;
  replyToId: string | null;
  createdAt: string;
}

function getStoredUser(): ChatUser | null {
  try {
    const raw = localStorage.getItem(TL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getStoredToken(): string | null {
  return localStorage.getItem(TL_TOKEN_KEY);
}

function AuthForm({ onAuth }: { onAuth: (user: ChatUser, token: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = mode === "login" ? "/api/chat/auth/login" : "/api/chat/auth/register";
      const body = mode === "login"
        ? { username, password }
        : { username, email, password, displayName };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Authentication failed");
        return;
      }

      localStorage.setItem(TL_TOKEN_KEY, data.token);
      localStorage.setItem(TL_USER_KEY, JSON.stringify(data.user));
      toast({ title: mode === "login" ? "Logged in" : "Account created", description: `Welcome, ${data.user.displayName}` });
      onAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4">
      <div className="text-center mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-base font-display font-bold" data-testid="text-signal-chat-title">Signal Chat</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">TrustLayer Ecosystem</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 w-full max-w-[280px]">
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          data-testid="input-chat-username"
        />
        {mode === "register" && (
          <>
            <Input
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              data-testid="input-chat-display-name"
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-chat-email"
            />
          </>
        )}
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="input-chat-password"
        />

        {error && (
          <p className="text-[11px] text-destructive" data-testid="text-chat-error">{error}</p>
        )}

        <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-chat-submit">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {mode === "login" ? "Sign In" : "Create Account"}
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          {mode === "login" ? "No account?" : "Have an account?"}{" "}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            data-testid="button-chat-toggle-mode"
          >
            {mode === "login" ? "Register" : "Sign In"}
          </button>
        </p>
      </form>
    </div>
  );
}

function ChannelList({
  channels,
  activeId,
  onSelect,
  presence,
}: {
  channels: ChatChannel[];
  activeId: string | null;
  onSelect: (id: string) => void;
  presence: Record<string, string[]>;
}) {
  const grouped: Record<string, ChatChannel[]> = {};
  channels.forEach((ch) => {
    if (!grouped[ch.category]) grouped[ch.category] = [];
    grouped[ch.category].push(ch);
  });

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, chs]) => (
        <div key={category}>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
            {category}
          </p>
          <div className="space-y-0.5">
            {chs.map((ch) => {
              const userCount = presence[ch.id]?.length || 0;
              return (
                <button
                  key={ch.id}
                  onClick={() => onSelect(ch.id)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                    activeId === ch.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover-elevate"
                  }`}
                  data-testid={`button-channel-${ch.name}`}
                >
                  <Hash className="w-3 h-3 shrink-0" />
                  <span className="truncate flex-1 text-left">{ch.name}</span>
                  {userCount > 0 && (
                    <span className="text-[9px] text-muted-foreground/60">{userCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({
  msg,
  currentUserId,
  onReply,
  replyTarget,
}: {
  msg: ChatMessage;
  currentUserId: string;
  onReply: (msg: ChatMessage) => void;
  replyTarget?: ChatMessage;
}) {
  const isOwn = msg.userId === currentUserId;
  const time = new Date(msg.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      className={`group flex gap-1.5 px-2 py-0.5 ${isOwn ? "flex-row-reverse" : ""}`}
      data-testid={`message-${msg.id}`}
    >
      <Avatar className="w-6 h-6 shrink-0 mt-0.5">
        <AvatarFallback style={{ backgroundColor: msg.avatarColor, color: "white" }} className="text-[10px] font-bold">
          {(msg.displayName || msg.username).charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col max-w-[80%] ${isOwn ? "items-end" : ""}`}>
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-[10px] font-medium" data-testid={`text-message-author-${msg.id}`}>{msg.displayName || msg.username}</span>
          {msg.role === "admin" && <Badge variant="outline" className="text-[8px] px-1 py-0 leading-tight">admin</Badge>}
          <span className="text-[9px] text-muted-foreground/50">{time}</span>
        </div>
        {msg.replyToId && replyTarget && (
          <div className="text-[9px] text-muted-foreground/60 bg-muted/30 rounded px-1.5 py-0.5 mb-0.5 truncate max-w-full">
            <Reply className="w-2.5 h-2.5 inline mr-0.5" />
            {replyTarget.username}: {replyTarget.content.slice(0, 40)}
          </div>
        )}
        <div className={`rounded-lg px-2.5 py-1 text-xs ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          {msg.content}
        </div>
        <button
          onClick={() => onReply(msg)}
          className="invisible group-hover:visible text-[9px] text-muted-foreground/50 mt-0.5 hover:text-muted-foreground"
          data-testid={`button-reply-${msg.id}`}
        >
          Reply
        </button>
      </div>
    </div>
  );
}

export function SignalChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);
  const [user, setUser] = useState<ChatUser | null>(getStoredUser);
  const userRef = useRef<ChatUser | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [typing, setTyping] = useState<{ userId: string; username: string }[]>([]);
  const [presence, setPresence] = useState<{ onlineCount: number; channelUsers: Record<string, string[]> }>({ onlineCount: 0, channelUsers: {} });
  const [showChannelList, setShowChannelList] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasBounce, setHasBounce] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/chat/channels", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.channels.length > 0) {
          setChannels(data.channels);
          const general = data.channels.find((c: ChatChannel) => c.name === "general");
          setActiveChannelId(general?.id || data.channels[0].id);
        }
      })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token || !activeChannelId) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "switch_channel", channelId: activeChannelId }));
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", token, channelId: activeChannelId }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "history") {
        setMessages(data.messages);
        setTimeout(scrollToBottom, 100);
      } else if (data.type === "message") {
        setMessages((prev) => [...prev, data]);
        setTimeout(scrollToBottom, 100);
        if (data.userId !== userRef.current?.id && !isOpenRef.current) {
          setUnreadCount((prev) => prev + 1);
          setHasBounce(true);
          setTimeout(() => setHasBounce(false), 1500);
        }
      } else if (data.type === "typing") {
        setTyping((prev) => {
          const exists = prev.find((t) => t.userId === data.userId);
          if (exists) return prev;
          return [...prev, { userId: data.userId, username: data.username }];
        });
        setTimeout(() => {
          setTyping((prev) => prev.filter((t) => t.userId !== data.userId));
        }, 3000);
      } else if (data.type === "presence") {
        setPresence({ onlineCount: data.onlineCount, channelUsers: data.channelUsers });
      } else if (data.type === "error") {
        toast({ title: "Chat Error", description: data.message, variant: "destructive" });
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token, activeChannelId]);

  useEffect(() => {
    const tryBridge = async () => {
      if (user || token) return;
      try {
        const res = await fetch("/api/auth/bridge-sso", { method: "POST", credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.token && data.user) {
          localStorage.setItem(TL_TOKEN_KEY, data.token);
          localStorage.setItem(TL_USER_KEY, JSON.stringify(data.user));
          setUser(data.user);
          setToken(data.token);
        }
      } catch {}
    };
    tryBridge();
  }, []);

  const handleChannelSwitch = (channelId: string) => {
    setActiveChannelId(channelId);
    setMessages([]);
    setReplyTo(null);
    setTyping([]);
    setShowChannelList(false);
  };

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: "message",
      content: input.trim(),
      replyToId: replyTo?.id,
    }));
    setInput("");
    setReplyTo(null);
  };

  const sendTyping = () => {
    if (!wsRef.current) return;
    if (typingTimeoutRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "typing" }));
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleAuth = (u: ChatUser, t: string) => {
    setUser(u);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem(TL_TOKEN_KEY);
    localStorage.removeItem(TL_USER_KEY);
    wsRef.current?.close();
    wsRef.current = null;
    setUser(null);
    setToken(null);
    setChannels([]);
    setMessages([]);
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const messagesMap = new Map(messages.map((m) => [m.id, m]));

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ x: -80 }}
            animate={{
              x: 0,
              y: hasBounce ? [0, -8, 0] : 0,
            }}
            exit={{ x: -80 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => setIsOpen(true)}
            className="fixed left-0 bottom-24 z-[90] flex items-center gap-0 cursor-pointer group"
            data-testid="button-open-signal-chat"
            aria-label="Open Signal Chat"
          >
            <div className="w-10 h-10 rounded-r-xl bg-primary flex items-center justify-center shadow-lg relative">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 shadow-md">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div className="bg-card border border-l-0 rounded-r-xl px-2 py-3 shadow-lg flex flex-col items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground [writing-mode:vertical-lr]">
                Signal
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -420, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 z-[95] w-full sm:w-[400px] flex flex-col"
          >
            <Card className="h-full rounded-none sm:rounded-r-2xl border-l-0 flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 p-3 border-b shrink-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-sm">Signal Chat</h3>
                  <div className="flex items-center gap-1.5">
                    <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" />
                    <span className="text-[10px] text-muted-foreground" data-testid="text-online-count">{presence.onlineCount} online</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {user && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowChannelList(!showChannelList)}
                      className={`toggle-elevate ${showChannelList ? "toggle-elevated" : ""}`}
                      data-testid="button-toggle-channels"
                    >
                      <Hash className="h-4 w-4" />
                    </Button>
                  )}
                  {user && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      data-testid="button-chat-logout"
                      title="Sign out"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    data-testid="button-close-signal-chat"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {(!user || !token) ? (
                <AuthForm onAuth={handleAuth} />
              ) : (
                <div className="flex flex-1 overflow-hidden">
                  <AnimatePresence>
                    {showChannelList && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 160, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="shrink-0 border-r overflow-y-auto overflow-x-hidden p-2 bg-muted/20"
                        data-testid="channel-sidebar"
                      >
                        <div className="flex items-center gap-1.5 mb-2 px-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Channels</span>
                        </div>
                        <ChannelList
                          channels={channels}
                          activeId={activeChannelId}
                          onSelect={handleChannelSwitch}
                          presence={presence.channelUsers}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {activeChannel && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b shrink-0">
                        <Hash className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium" data-testid="text-active-channel">{activeChannel.name}</span>
                        {activeChannel.description && (
                          <span className="text-[10px] text-muted-foreground/60 hidden sm:inline truncate">{activeChannel.description}</span>
                        )}
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto py-2 space-y-0.5" data-testid="messages-container">
                      {messages.length === 0 && (
                        <div className="flex items-center justify-center h-full text-muted-foreground/40 text-xs">
                          No messages yet
                        </div>
                      )}
                      {messages.map((msg) => (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          currentUserId={user.id}
                          onReply={setReplyTo}
                          replyTarget={msg.replyToId ? messagesMap.get(msg.replyToId) : undefined}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {typing.length > 0 && (
                      <div className="px-3 py-0.5 text-[10px] text-muted-foreground/60 shrink-0" data-testid="text-typing-indicator">
                        {typing.map((t) => t.username).join(", ")} {typing.length === 1 ? "is" : "are"} typing...
                      </div>
                    )}

                    {replyTo && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/30 border-t shrink-0">
                        <Reply className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-[10px] text-muted-foreground truncate flex-1">
                          Replying to <strong>{replyTo.username}</strong>: {replyTo.content.slice(0, 60)}
                        </span>
                        <Button size="icon" variant="ghost" onClick={() => setReplyTo(null)} data-testid="button-cancel-reply">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 px-2 py-2 border-t shrink-0">
                      <Input
                        placeholder={activeChannel ? `#${activeChannel.name}` : "Select a channel"}
                        value={input}
                        onChange={(e) => { setInput(e.target.value); sendTyping(); }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        disabled={!activeChannelId}
                        className="text-xs"
                        data-testid="input-chat-message"
                      />
                      <Button
                        size="icon"
                        onClick={sendMessage}
                        disabled={!input.trim() || !activeChannelId}
                        data-testid="button-send-message"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
