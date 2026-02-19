import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Upload, Sparkles, Share2, AlertCircle, Check, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/glass-card";
import { format } from "date-fns";

export interface Notification {
  id: string;
  type: "upload" | "ai" | "share" | "system" | "success" | "error";
  title: string;
  description?: string;
  timestamp: Date;
  read: boolean;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  upload: { icon: Upload, color: "text-blue-400", bg: "bg-blue-500/10" },
  ai: { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10" },
  share: { icon: Share2, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  system: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10" },
  success: { icon: Check, color: "text-green-400", bg: "bg-green-500/10" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

let globalAddNotification: ((n: Omit<Notification, "id" | "timestamp" | "read">) => void) | null = null;

export function addNotification(n: Omit<Notification, "id" | "timestamp" | "read">) {
  globalAddNotification?.(n);
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const addNotif = useCallback((n: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotif: Notification = {
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    globalAddNotification = addNotif;
    return () => { globalAddNotification = null; };
  }, [addNotif]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const removeNotif = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => { setOpen(prev => !prev); }}
        className="relative"
        data-testid="button-notification-center"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse" data-testid="badge-unread-count">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-[100]"
          >
            <GlassCard glow className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold" data-testid="text-notifications-title">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px]">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {notifications.length > 0 && (
                    <>
                      <Button variant="ghost" size="icon" onClick={markAllRead} data-testid="button-mark-all-read" title="Mark all read">
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={clearAll} data-testid="button-clear-notifications" title="Clear all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)} data-testid="button-close-notifications">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Actions like uploads and AI processing will appear here</p>
                  </div>
                ) : (
                  <div>
                    {notifications.map((notif) => {
                      const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                      const Icon = config.icon;
                      return (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={`flex items-start gap-3 p-3 border-b border-white/5 hover-elevate cursor-pointer ${!notif.read ? "bg-white/[0.02]" : ""}`}
                          onClick={() => markRead(notif.id)}
                          data-testid={`notification-item-${notif.id}`}
                        >
                          <div className={`shrink-0 w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center mt-0.5`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium leading-tight ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                              )}
                            </div>
                            {notif.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.description}</p>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground/50" />
                              <span className="text-[10px] text-muted-foreground/50">
                                {format(notif.timestamp, "h:mm a")}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); removeNotif(notif.id); }}
                            data-testid={`button-dismiss-${notif.id}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
