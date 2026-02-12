import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useHaptic } from "@/hooks/use-haptic";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListMusic, Plus, Trash2, Play, Share2, Users, Music, X, GripVertical, ChevronRight
} from "lucide-react";
import type { MediaResponse } from "@shared/routes";

type PlaylistData = {
  id: number;
  tenantId: string;
  name: string;
  description: string | null;
  isShared: boolean | null;
  itemCount: number;
};

type PlaylistItemData = {
  id: number;
  playlistId: number;
  mediaItemId: number;
  addedByTenantId: string | null;
  sortOrder: number | null;
  mediaTitle: string;
  mediaUrl: string;
  mediaCategory: string;
  mediaDuration: number | null;
};

function formatDuration(sec: number | null): string {
  if (!sec) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlaylistPanel({
  onPlayTrack,
  onPlayPlaylist,
}: {
  onPlayTrack?: (item: MediaResponse) => void;
  onPlayPlaylist?: (items: MediaResponse[]) => void;
}) {
  const { toast } = useToast();
  const haptic = useHaptic();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [shareDialogId, setShareDialogId] = useState<number | null>(null);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);

  const { data: playlistsData, isLoading: playlistsLoading } = useQuery<{ owned: PlaylistData[]; shared: PlaylistData[] }>({
    queryKey: ["/api/playlists"],
  });

  const { data: expandedItems } = useQuery<PlaylistItemData[]>({
    queryKey: ["/api/playlists", expandedId, "items"],
    queryFn: async () => {
      if (!expandedId) return [];
      const res = await fetch(`/api/playlists/${expandedId}/items`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!expandedId,
  });

  const { data: users } = useQuery<{ id: number; name: string; tenantId: string }[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/playlists", { name: newName, description: newDesc || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      haptic("success");
      toast({ title: "Playlist created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/playlists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      haptic("warning");
      toast({ title: "Playlist deleted" });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async ({ playlistId, mediaId }: { playlistId: number; mediaId: number }) => {
      return apiRequest("DELETE", `/api/playlists/${playlistId}/items/${mediaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", expandedId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!shareDialogId) return;
      return apiRequest("POST", `/api/playlists/${shareDialogId}/share`, { sharedWithTenantIds: selectedTenants });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setShareDialogId(null);
      setSelectedTenants([]);
      haptic("success");
      toast({ title: "Playlist shared with family" });
    },
  });

  const owned = playlistsData?.owned || [];
  const shared = playlistsData?.shared || [];
  const allPlaylists = [...owned, ...shared];

  if (playlistsLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded shimmer" />
            <div className="w-20 h-4 rounded shimmer" />
          </div>
          <div className="w-16 h-8 rounded-full shimmer" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-white/8 p-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg shimmer" />
            <div className="flex-1 space-y-1.5">
              <div className="w-24 h-3.5 rounded shimmer" />
              <div className="w-16 h-2.5 rounded shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (allPlaylists.length === 0 && !showCreate) {
    return (
      <Card className="p-6 text-center">
        <ListMusic className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-1">No playlists yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create your first playlist to organize your favorite tracks
        </p>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Playlist
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">Playlists</h3>
          <Badge variant="secondary" className="text-xs">{allPlaylists.length}</Badge>
        </div>
        <Button
          data-testid="button-new-playlist"
          size="sm"
          variant="outline"
          onClick={() => setShowCreate(!showCreate)}
          className="gap-1.5 rounded-full"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </Button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-3 space-y-2">
              <Input
                data-testid="input-playlist-name"
                placeholder="Playlist name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Input
                data-testid="input-playlist-desc"
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button
                  data-testid="button-create-playlist"
                  size="sm"
                  disabled={!newName.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Create
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1.5">
        {owned.map((pl) => (
          <PlaylistRow
            key={`owned-${pl.id}`}
            playlist={pl}
            isOwned
            isExpanded={expandedId === pl.id}
            onToggle={() => setExpandedId(expandedId === pl.id ? null : pl.id)}
            onDelete={() => deleteMutation.mutate(pl.id)}
            onShare={() => { setShareDialogId(pl.id); setSelectedTenants([]); }}
            expandedItems={expandedId === pl.id ? expandedItems : undefined}
            onRemoveItem={(mediaId) => removeItemMutation.mutate({ playlistId: pl.id, mediaId })}
            onPlayTrack={onPlayTrack}
          />
        ))}

        {shared.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-3 mb-1 px-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Shared with you</span>
            </div>
            {shared.map((pl) => (
              <PlaylistRow
                key={`shared-${pl.id}`}
                playlist={pl}
                isOwned={false}
                isExpanded={expandedId === pl.id}
                onToggle={() => setExpandedId(expandedId === pl.id ? null : pl.id)}
                expandedItems={expandedId === pl.id ? expandedItems : undefined}
                onPlayTrack={onPlayTrack}
              />
            ))}
          </>
        )}
      </div>

      <Dialog open={!!shareDialogId} onOpenChange={(open) => !open && setShareDialogId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share Playlist</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Select family members to share this playlist with:
          </p>
          <div className="space-y-2">
            {(users || []).map((u) => (
              <label key={u.tenantId} className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer">
                <Checkbox
                  data-testid={`checkbox-share-${u.tenantId}`}
                  checked={selectedTenants.includes(u.tenantId)}
                  onCheckedChange={(checked) => {
                    setSelectedTenants(prev =>
                      checked ? [...prev, u.tenantId] : prev.filter(t => t !== u.tenantId)
                    );
                  }}
                />
                <span className="capitalize font-medium text-sm">{u.name}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button size="sm" variant="ghost" onClick={() => setShareDialogId(null)}>Cancel</Button>
            <Button
              data-testid="button-confirm-share-playlist"
              size="sm"
              disabled={selectedTenants.length === 0 || shareMutation.isPending}
              onClick={() => shareMutation.mutate()}
              className="gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlaylistRow({
  playlist,
  isOwned,
  isExpanded,
  onToggle,
  onDelete,
  onShare,
  expandedItems,
  onRemoveItem,
  onPlayTrack,
}: {
  playlist: PlaylistData;
  isOwned: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  expandedItems?: PlaylistItemData[];
  onRemoveItem?: (mediaId: number) => void;
  onPlayTrack?: (item: MediaResponse) => void;
}) {
  return (
    <div className="rounded-lg border border-white/8 overflow-visible">
      <button
        data-testid={`button-playlist-${playlist.id}`}
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-2.5 text-left hover-elevate active-elevate-2 rounded-lg"
      >
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Music className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{playlist.name}</span>
            {playlist.isShared && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <Share2 className="w-2.5 h-2.5 mr-0.5" />
                Shared
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {playlist.itemCount} {playlist.itemCount === 1 ? "track" : "tracks"}
          </span>
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/8 p-2 space-y-1">
              {expandedItems?.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-1.5 rounded-md hover-elevate group"
                >
                  <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">{idx + 1}</span>
                  <button
                    data-testid={`button-play-track-${item.mediaItemId}`}
                    className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 hover-elevate"
                    onClick={() => {
                      if (onPlayTrack) {
                        onPlayTrack({
                          id: item.mediaItemId,
                          title: item.mediaTitle,
                          url: item.mediaUrl,
                          category: item.mediaCategory as any,
                        } as MediaResponse);
                      }
                    }}
                  >
                    <Play className="w-3 h-3 text-primary ml-0.5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.mediaTitle}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatDuration(item.mediaDuration)}</span>
                  {isOwned && onRemoveItem && (
                    <button
                      data-testid={`button-remove-track-${item.mediaItemId}`}
                      className="invisible group-hover:visible p-1 rounded hover-elevate"
                      onClick={(e) => { e.stopPropagation(); onRemoveItem(item.mediaItemId); }}
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}

              {(!expandedItems || expandedItems.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No tracks yet. Add audio from your vault!
                </p>
              )}

              {isOwned && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                  {onShare && (
                    <Button
                      data-testid={`button-share-playlist-${playlist.id}`}
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs"
                      onClick={onShare}
                    >
                      <Users className="w-3 h-3" />
                      Share
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      data-testid={`button-delete-playlist-${playlist.id}`}
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs text-destructive"
                      onClick={onDelete}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AddToPlaylistDialog({
  open,
  onOpenChange,
  mediaItemId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaItemId: number;
}) {
  const { toast } = useToast();
  const { data: playlistsData } = useQuery<{ owned: PlaylistData[]; shared: PlaylistData[] }>({
    queryKey: ["/api/playlists"],
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (playlistId: number) => {
      return apiRequest("POST", `/api/playlists/${playlistId}/items`, { mediaItemId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({ title: "Added to playlist" });
      onOpenChange(false);
    },
  });

  const owned = playlistsData?.owned || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
        </DialogHeader>
        {owned.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No playlists yet. Create one from the playlist panel first!
          </p>
        ) : (
          <div className="space-y-1.5">
            {owned.map((pl) => (
              <button
                key={pl.id}
                data-testid={`button-add-to-playlist-${pl.id}`}
                onClick={() => addMutation.mutate(pl.id)}
                disabled={addMutation.isPending}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover-elevate active-elevate-2"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <ListMusic className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pl.name}</p>
                  <p className="text-xs text-muted-foreground">{pl.itemCount} tracks</p>
                </div>
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}