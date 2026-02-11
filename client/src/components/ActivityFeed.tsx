import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Upload, Trash2, FolderPlus, Heart, Share2, Pencil, Clock, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ActivityItem {
  id: number;
  tenantId: string | null;
  actorName: string;
  actionType: string;
  entityType: string | null;
  entityId: number | null;
  entityTitle: string | null;
  metadata: string | null;
  createdAt: string;
}

const ACTION_ICONS: Record<string, any> = {
  upload: Upload,
  delete: Trash2,
  create_collection: FolderPlus,
  favorite: Heart,
  share: Share2,
  edit: Pencil,
};

const ACTION_COLORS: Record<string, string> = {
  upload: "text-green-400 bg-green-500/10",
  delete: "text-red-400 bg-red-500/10",
  create_collection: "text-blue-400 bg-blue-500/10",
  favorite: "text-pink-400 bg-pink-500/10",
  share: "text-purple-400 bg-purple-500/10",
  edit: "text-amber-400 bg-amber-500/10",
};

const ACTION_LABELS: Record<string, string> = {
  upload: "uploaded",
  delete: "deleted",
  create_collection: "created collection",
  favorite: "favorited",
  share: "shared",
  edit: "edited",
};

export function ActivityFeed({ compact = false }: { compact?: boolean }) {
  const { data: activities, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activity"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl p-4 glass-morphism" data-testid="panel-activity-loading">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Activity</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full shimmer" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded shimmer" />
                <div className="h-2.5 w-1/3 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-xl p-4 glass-morphism" data-testid="panel-activity-empty">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Activity</span>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">No activity yet. Upload some files to get started.</p>
      </div>
    );
  }

  const displayItems = compact ? activities.slice(0, 5) : activities;

  return (
    <div className="rounded-xl p-4 glass-morphism" data-testid="panel-activity-feed">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Activity</span>
          <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
            {activities.length}
          </Badge>
        </div>
      </div>

      <div className="space-y-1">
        {displayItems.map((activity, i) => {
          const Icon = ACTION_ICONS[activity.actionType] || Clock;
          const colorClasses = ACTION_COLORS[activity.actionType] || "text-muted-foreground bg-white/5";
          const label = ACTION_LABELS[activity.actionType] || activity.actionType;
          const timeAgo = getRelativeTime(activity.createdAt);

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              className="flex items-start gap-3 py-2 px-2 rounded-lg hover-elevate"
              data-testid={`activity-item-${activity.id}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${colorClasses}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-relaxed">
                  <span className="font-semibold">{activity.actorName}</span>
                  {" "}{label}
                  {activity.entityTitle && (
                    <span className="font-medium text-primary"> {activity.entityTitle}</span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, "MMM d");
}