import { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Hash, Send, ArrowLeft, Users, MessageSquare, Reply,
  X, LogIn, UserPlus, Loader2, Circle, Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHaptic } from "@/hooks/use-haptic";

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-signal-chat-title">Signal Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">TrustLayer Ecosystem Communication</p>
        </div>

        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <p className="text-sm text-destructive" data-testid="text-chat-error">{error}</p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-chat-submit">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
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
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/50 mt-4">
          Powered by TrustLayer SSO
        </p>
      </motion.div>
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
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, chs]) => (
        <div key={category}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
            {category}
          </p>
          <div className="space-y-0.5">
            {chs.map((ch) => {
              const userCount = presence[ch.id]?.length || 0;
              return (
                <button
                  key={ch.id}
                  onClick={() => onSelect(ch.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    activeId === ch.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover-elevate"
                  }`}
                  data-testid={`button-channel-${ch.name}`}
                >
                  <Hash className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1 text-left">{ch.name}</span>
                  {userCount > 0 && (
                    <span className="text-[10px] text-muted-foreground/60">{userCount}</span>
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex gap-2 px-3 py-1 ${isOwn ? "flex-row-reverse" : ""}`}
      data-testid={`message-${msg.id}`}
    >
      <Avatar className="w-7 h-7 shrink-0 mt-0.5">
        <AvatarFallback style={{ backgroundColor: msg.avatarColor, color: "white" }} className="text-xs font-bold">
          {(msg.displayName || msg.username).charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col max-w-[75%] ${isOwn ? "items-end" : ""}`}>
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xs font-medium" data-testid={`text-message-author-${msg.id}`}>{msg.displayName || msg.username}</span>
          {msg.role === "admin" && <Badge variant="outline" className="text-[9px] px-1 py-0">admin</Badge>}
          <span className="text-[10px] text-muted-foreground/50">{time}</span>
        </div>
        {msg.replyToId && replyTarget && (
          <div className="text-[10px] text-muted-foreground/60 bg-muted/30 rounded px-2 py-0.5 mb-0.5 truncate max-w-full">
            <Reply className="w-3 h-3 inline mr-1" />
            {replyTarget.username}: {replyTarget.content.slice(0, 60)}
          </div>
        )}
        <div className={`rounded-xl px-3 py-1.5 text-sm ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          {msg.content}
        </div>
        <button
          onClick={() => onReply(msg)}
          className="invisible group-hover:visible text-[10px] text-muted-foreground/50 mt-0.5 hover:text-muted-foreground"
          data-testid={`button-reply-${msg.id}`}
        >
          Reply
        </button>
      </div>
    </motion.div>
  );
}

export default function SignalChat() {
  const [, navigate] = useLocation();
  const haptic = useHaptic();
  const [user, setUser] = useState<ChatUser | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [typing, setTyping] = useState<{ userId: string; username: string }[]>([]);
  const [presence, setPresence] = useState<{ onlineCount: number; channelUsers: Record<string, string[]>; onlineUsers: { userId: string; username: string; displayName: string; avatarColor: string; role: string }[] }>({ onlineCount: 0, channelUsers: {}, onlineUsers: [] });
  const [showChannels, setShowChannels] = useState(true);
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<{ id: number; senderId: string; receiverId: string; senderUsername?: string; senderDisplayName?: string; senderAvatarColor?: string; content: string; createdAt: string }[]>([]);
  const [dmPartners, setDmPartners] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

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

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "switch_channel", channelId: activeChannelId }));
      return;
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
        setPresence({ onlineCount: data.onlineCount, channelUsers: data.channelUsers, onlineUsers: data.onlineUsers || [] });
      } else if (data.type === "dm") {
        setDmMessages((prev) => {
          if (prev.find(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
        setDmPartners((prev) => {
          const partnerId = data.senderId === user?.id ? data.receiverId : data.senderId;
          if (prev.includes(partnerId)) return prev;
          return [...prev, partnerId];
        });
        setTimeout(scrollToBottom, 100);
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

  const loadDmHistory = useCallback(async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chat/dm/${targetUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDmMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error("Failed to load DM history:", err);
    }
  }, [token, scrollToBottom]);

  const loadDmPartners = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/chat/dm/partners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDmPartners(data.partners || []);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    if (token) loadDmPartners();
  }, [token, loadDmPartners]);

  const startDm = useCallback((targetUserId: string) => {
    setActiveDmUserId(targetUserId);
    setActiveChannelId(null);
    setMessages([]);
    setReplyTo(null);
    setTyping([]);
    loadDmHistory(targetUserId);
  }, [loadDmHistory]);

  const handleChannelSwitch = (channelId: string) => {
    setActiveChannelId(channelId);
    setActiveDmUserId(null);
    setDmMessages([]);
    setMessages([]);
    setReplyTo(null);
    setTyping([]);
    if (typeof document !== "undefined" && document.documentElement.clientWidth < 768) setShowChannels(false);
  };

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current) return;
    if (activeDmUserId) {
      wsRef.current.send(JSON.stringify({
        type: "dm",
        receiverId: activeDmUserId,
        content: input.trim(),
      }));
      setInput("");
      return;
    }
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

  if (!user || !token) {
    return (
      <>
        <Helmet>
          <title>Signal Chat | TrustLayer</title>
        </Helmet>
        <AuthForm onAuth={handleAuth} />
      </>
    );
  }

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const messagesMap = new Map(messages.map((m) => [m.id, m]));

  return (
    <>
      <Helmet>
        <title>Signal Chat | TrustLayer Ecosystem</title>
        <meta name="description" content="Real-time encrypted messaging across the TrustLayer ecosystem. Channel-based conversations for teams and communities." />
        <meta property="og:title" content="Signal Chat | TrustLayer" />
        <meta property="og:description" content="Secure, real-time messaging for the TrustLayer ecosystem." />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="h-screen flex flex-col bg-background" data-testid="signal-chat-container">
        <header className="flex items-center justify-between gap-2 px-2 sm:px-3 py-2 border-b shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Button size="icon" variant="ghost" onClick={() => navigate("/")} data-testid="button-chat-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden"
              onClick={() => setShowChannels(!showChannels)}
              data-testid="button-toggle-channels"
            >
              <Hash className="w-4 h-4" />
            </Button>
            <MessageSquare className="w-5 h-5 text-primary hidden sm:block" />
            <span className="font-display font-semibold text-sm hidden sm:block">Signal Chat</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
              <span className="text-[11px] text-muted-foreground" data-testid="text-online-count">{presence.onlineCount}</span>
            </div>
            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex" data-testid="text-trust-layer-id">
              {user.trustLayerId || user.username}
            </Badge>
            <Button size="icon" variant="ghost" onClick={handleLogout} data-testid="button-chat-logout" aria-label="Sign out">
              <LogIn className="w-4 h-4 rotate-180" />
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <AnimatePresence>
            {showChannels && (
              <motion.aside
                initial={{ x: -250, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -250, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-56 shrink-0 border-r p-3 overflow-y-auto bg-background md:bg-muted/20 absolute md:relative z-30 h-full md:h-auto shadow-xl md:shadow-none"
                data-testid="channel-sidebar"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channels</span>
                </div>
                <ChannelList
                  channels={channels}
                  activeId={activeChannelId}
                  onSelect={handleChannelSwitch}
                  presence={presence.channelUsers}
                />

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Direct Messages
                    </span>
                  </div>
                  <div className="space-y-0.5 mb-3">
                    {(() => {
                      const onlineIds = new Set(presence.onlineUsers.map(ou => ou.userId));
                      const onlineOthers = presence.onlineUsers.filter(ou => ou.userId !== user.id);
                      const offlinePartnerIds = dmPartners.filter(pid => pid !== user.id && !onlineIds.has(pid));

                      return (
                        <>
                          {onlineOthers.map((ou) => (
                            <button
                              key={ou.userId}
                              onClick={() => { startDm(ou.userId); if (typeof document !== "undefined" && document.documentElement.clientWidth < 768) setShowChannels(false); }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                                activeDmUserId === ou.userId
                                  ? "bg-primary/10 text-primary"
                                  : "hover-elevate"
                              }`}
                              data-testid={`button-dm-${ou.userId}`}
                            >
                              <div className="relative">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback style={{ backgroundColor: ou.avatarColor, color: "white" }} className="text-[10px] font-bold">
                                    {ou.displayName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <Circle className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 fill-emerald-500 text-emerald-500 border border-background rounded-full" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium truncate">{ou.displayName}</span>
                                {ou.role === "admin" && (
                                  <span className="text-[9px] text-muted-foreground">Admin</span>
                                )}
                              </div>
                            </button>
                          ))}
                          {offlinePartnerIds.map((pid) => (
                            <button
                              key={pid}
                              onClick={() => { startDm(pid); if (typeof document !== "undefined" && document.documentElement.clientWidth < 768) setShowChannels(false); }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                                activeDmUserId === pid
                                  ? "bg-primary/10 text-primary"
                                  : "hover-elevate"
                              }`}
                              data-testid={`button-dm-${pid}`}
                            >
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-[10px] font-bold bg-muted-foreground/20">
                                  ?
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground truncate">{pid}</span>
                            </button>
                          ))}
                          {onlineOthers.length === 0 && offlinePartnerIds.length === 0 && (
                            <p className="text-[10px] text-muted-foreground/50 px-2 py-1">No conversations yet</p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          <main className="flex-1 flex flex-col overflow-hidden">
            {activeDmUserId ? (
              <>
                {(() => {
                  const dmUser = presence.onlineUsers.find(u => u.userId === activeDmUserId);
                  const dmName = dmUser?.displayName || activeDmUserId;
                  const dmColor = dmUser?.avatarColor || "#6366f1";
                  return (
                    <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback style={{ backgroundColor: dmColor, color: "white" }} className="text-[10px] font-bold">
                          {dmName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium" data-testid="text-dm-partner">{dmName}</span>
                      <Badge variant="outline" className="text-[9px]">DM</Badge>
                    </div>
                  );
                })()}

                <div className="flex-1 overflow-y-auto py-3 space-y-2 px-1" data-testid="dm-messages-container">
                  {(() => {
                    const filteredDms = dmMessages.filter(dm =>
                      (dm.senderId === activeDmUserId && dm.receiverId === user.id) ||
                      (dm.senderId === user.id && dm.receiverId === activeDmUserId)
                    );
                    if (filteredDms.length === 0) return (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 text-sm gap-2">
                        <Mail className="w-8 h-8" />
                        <span>No messages yet. Say hello!</span>
                      </div>
                    );
                    return filteredDms.map((dm) => {
                    const isOwn = dm.senderId === user.id;
                    const senderName = isOwn ? (user.displayName || user.username) : (dm.senderDisplayName || dm.senderUsername || dm.senderId);
                    const senderColor = isOwn ? user.avatarColor : (dm.senderAvatarColor || "#6366f1");
                    const time = new Date(dm.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                    return (
                      <motion.div
                        key={dm.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 px-3 py-1 ${isOwn ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                          <AvatarFallback style={{ backgroundColor: senderColor, color: "white" }} className="text-xs font-bold">
                            {senderName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col max-w-[75%] ${isOwn ? "items-end" : ""}`}>
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-xs font-medium">{senderName}</span>
                            <span className="text-[10px] text-muted-foreground/50">{time}</span>
                          </div>
                          <div className={`rounded-xl px-3 py-1.5 text-sm ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            {dm.content}
                          </div>
                        </div>
                      </motion.div>
                    );
                  });
                  })()}
                  <div ref={messagesEndRef} />
                </div>
              </>
            ) : (
              <>
                {activeChannel && (
                  <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium" data-testid="text-active-channel">{activeChannel.name}</span>
                    {activeChannel.description && (
                      <span className="text-xs text-muted-foreground/60 hidden sm:inline truncate">{activeChannel.description}</span>
                    )}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto py-3 space-y-1" data-testid="messages-container">
                  {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-muted-foreground/40 text-sm">
                      No messages yet. Start the conversation!
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
                  <div className="px-4 py-1 text-[11px] text-muted-foreground/60 shrink-0" data-testid="text-typing-indicator">
                    {typing.map((t) => t.username).join(", ")} {typing.length === 1 ? "is" : "are"} typing...
                  </div>
                )}

                {replyTo && (
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/30 border-t shrink-0">
                    <Reply className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      Replying to <strong>{replyTo.username}</strong>: {replyTo.content.slice(0, 80)}
                    </span>
                    <Button size="icon" variant="ghost" onClick={() => setReplyTo(null)} data-testid="button-cancel-reply">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-2 px-2 sm:px-3 py-2 border-t shrink-0">
              <Input
                placeholder={activeDmUserId
                  ? `Message ${presence.onlineUsers.find(u => u.userId === activeDmUserId)?.displayName || "user"}...`
                  : activeChannel ? `Message #${activeChannel.name}` : "Select a channel"
                }
                value={input}
                onChange={(e) => { setInput(e.target.value); if (!activeDmUserId) sendTyping(); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); haptic("tap"); } }}
                disabled={!activeChannelId && !activeDmUserId}
                className="text-sm"
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={() => { sendMessage(); haptic("tap"); }}
                disabled={!input.trim() || (!activeChannelId && !activeDmUserId)}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
