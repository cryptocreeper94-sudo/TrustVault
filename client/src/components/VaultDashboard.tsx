import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Film, Music, ImageIcon, FileText, File, HardDrive, FolderOpen, TrendingUp, Clock, Play, Eye, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type MediaCategory, TIER_LIMITS, type SubscriptionTier } from "@shared/schema";
import { type MediaResponse } from "@shared/routes";
import { format } from "date-fns";

const CATEGORY_ICONS: Record<string, any> = {
  video: Film,
  audio: Music,
  image: ImageIcon,
  document: FileText,
  other: File,
};

const CATEGORY_GRADIENT: Record<string, string> = {
  video: "from-blue-500/20 to-blue-600/5",
  audio: "from-green-500/20 to-green-600/5",
  image: "from-purple-500/20 to-purple-600/5",
  document: "from-amber-500/20 to-amber-600/5",
  other: "from-gray-500/20 to-gray-600/5",
};

const CATEGORY_COLORS: Record<string, string> = {
  video: "text-blue-400",
  audio: "text-green-400",
  image: "text-purple-400",
  document: "text-amber-400",
  other: "text-muted-foreground",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

interface StatsData {
  totalFiles: number;
  totalSize: number;
  byCategory: Record<string, { count: number; size: number }>;
}

interface UsageData {
  used: number;
  limit: number;
  itemCount: number;
  itemLimit: number;
  tier: string;
}

export function VaultStats() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ["/api/media/stats"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="rounded-xl p-3.5 glass-morphism">
            <div className="h-4 w-16 rounded shimmer mb-2" />
            <div className="h-7 w-10 rounded shimmer" />
          </div>
        ))}
      </div>
    );
  }

  const categories = ["video", "audio", "image", "document", "other"];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6" data-testid="panel-vault-stats">
      {categories.map((cat, i) => {
        const Icon = CATEGORY_ICONS[cat];
        const catData = stats.byCategory[cat] || { count: 0, size: 0 };
        return (
          <motion.div
            key={cat}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={`rounded-xl p-3.5 bg-gradient-to-br ${CATEGORY_GRADIENT[cat]} border border-white/5 backdrop-blur-sm`}
            data-testid={`stat-${cat}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`w-4 h-4 ${CATEGORY_COLORS[cat]}`} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{cat === "image" ? "Images" : cat === "document" ? "Docs" : cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
            </div>
            <p className="text-xl font-display font-bold text-foreground">
              <AnimatedCounter value={catData.count} />
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(catData.size)}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

export function StorageUsage() {
  const { data: usage, isLoading } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  if (isLoading || !usage) {
    return (
      <div className="rounded-xl p-4 glass-morphism mb-6">
        <div className="h-4 w-32 rounded shimmer mb-3" />
        <div className="h-3 w-full rounded-full shimmer" />
      </div>
    );
  }

  const isUnlimited = usage.limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((usage.used / usage.limit) * 100, 100);
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 glass-morphism mb-6"
      data-testid="panel-storage-usage"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Storage</span>
          <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate uppercase">
            {usage.tier}
          </Badge>
        </div>
        <div className="text-right">
          <span className="text-sm font-mono font-semibold text-foreground">{formatBytes(usage.used)}</span>
          <span className="text-xs text-muted-foreground"> / {isUnlimited ? "Unlimited" : formatBytes(usage.limit)}</span>
        </div>
      </div>

      {!isUnlimited && (
        <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`absolute inset-y-0 left-0 rounded-full ${
              isCritical ? "bg-gradient-to-r from-red-500 to-red-400" :
              isWarning ? "bg-gradient-to-r from-amber-500 to-amber-400" :
              "bg-gradient-to-r from-primary to-primary/70"
            }`}
          />
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-muted-foreground">
          {usage.itemCount} {usage.itemCount === 1 ? "file" : "files"}
          {usage.itemLimit > 0 && ` of ${usage.itemLimit.toLocaleString()} max`}
        </span>
        {!isUnlimited && (
          <span className={`text-[11px] font-semibold ${isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-muted-foreground"}`}>
            {percentage.toFixed(0)}% used
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function RecentCarousel({ onPlay }: { onPlay: (item: MediaResponse) => void }) {
  const { data: recentItems, isLoading } = useQuery<MediaResponse[]>({
    queryKey: ["/api/media/recent"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Recently Added</span>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="shrink-0 w-36 rounded-xl overflow-hidden card-glow">
              <div className="aspect-[4/3] shimmer" />
              <div className="p-2 space-y-1.5">
                <div className="h-3 w-20 rounded shimmer" />
                <div className="h-2.5 w-14 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!recentItems || recentItems.length === 0) return null;

  const GRADIENT_MAP: Record<string, string> = {
    video: "premium-gradient-video",
    audio: "premium-gradient-audio",
    image: "premium-gradient-image",
    document: "premium-gradient-document",
    other: "premium-gradient-other",
  };

  return (
    <div className="mb-6" data-testid="panel-recent-carousel">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Recently Added</span>
        <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
          {recentItems.length}
        </Badge>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {recentItems.map((item, i) => {
          const cat = (item.category as MediaCategory) || "other";
          const Icon = CATEGORY_ICONS[cat] || File;
          const hasVisual = cat === "image" || ((cat === "video" || cat === "audio") && item.thumbnailUrl);
          const displayDate = item.createdAt ? format(new Date(item.createdAt), "MMM d") : "";

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => onPlay(item)}
              className="shrink-0 w-36 sm:w-40 rounded-xl overflow-hidden card-glow text-left group"
              data-testid={`recent-item-${item.id}`}
            >
              <div className={`aspect-[4/3] relative ${GRADIENT_MAP[cat] || "premium-gradient-other"} overflow-hidden`}>
                {hasVisual ? (
                  <img
                    src={`/objects/${cat === "image" ? item.url : item.thumbnailUrl}`}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-white/60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                    {cat === "video" ? <Play className="w-4 h-4 text-white ml-0.5 fill-white" /> : <Eye className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </div>
              <div className="p-2.5 bg-gradient-to-b from-black/50 to-card/80">
                <p className="text-xs font-semibold text-white truncate" data-testid={`recent-title-${item.id}`}>{item.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{displayDate}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
