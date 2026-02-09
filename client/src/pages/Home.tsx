import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useMediaItems,
  useCollections,
  useCollectionItems,
  useCreateCollection,
  useBatchUpdateMedia,
  useBatchDeleteMedia,
  useAddToCollection,
  useRemoveFromCollection,
} from "@/hooks/use-media";
import { UploadDialog } from "@/components/UploadDialog";
import { MediaGrid } from "@/components/MediaGrid";
import { MediaViewer } from "@/components/MediaViewer";
import { EditMediaDialog } from "@/components/EditMediaDialog";
import { Button } from "@/components/ui/button";
import { type MediaResponse } from "@shared/routes";
import { type MediaCategory, MEDIA_CATEGORIES } from "@shared/schema";
import {
  Loader2, Plus, LogOut, Shield, Search, Lock, KeyRound, Eye, EyeOff,
  Film, Music, ImageIcon, FileText, File, LayoutGrid, Heart, Star,
  Grid, List, ChevronDown, ChevronRight, FolderOpen, FolderPlus,
  Check, CheckSquare, Square, ArrowUpDown, CalendarRange, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useHaptic } from "@/hooks/use-haptic";
import { format, parseISO } from "date-fns";
import type { CollectionWithCount } from "@shared/schema";

function getGreeting(): string {
  const now = new Date();
  const centralHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Chicago",
    }).format(now),
    10
  );

  if (centralHour >= 5 && centralHour < 12) return "Good morning";
  if (centralHour >= 12 && centralHour < 17) return "Good afternoon";
  return "Good evening";
}

const FILTER_TABS: { key: string; label: string; icon: any }[] = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "video", label: "Video", icon: Film },
  { key: "audio", label: "Audio", icon: Music },
  { key: "image", label: "Images", icon: ImageIcon },
  { key: "document", label: "Docs", icon: FileText },
  { key: "favorites", label: "Favorites", icon: Heart },
];

type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "size-desc" | "size-asc";
type ViewMode = "grid" | "timeline";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Date (newest first)" },
  { value: "date-asc", label: "Date (oldest first)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "size-desc", label: "Size (largest)" },
  { value: "size-asc", label: "Size (smallest)" },
];

function getItemDate(item: MediaResponse): Date {
  if (item.fileDate) return new Date(item.fileDate);
  if (item.createdAt) return new Date(item.createdAt);
  return new Date(0);
}

function sortItems(items: MediaResponse[], sort: SortOption): MediaResponse[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sort) {
      case "date-desc":
        return getItemDate(b).getTime() - getItemDate(a).getTime();
      case "date-asc":
        return getItemDate(a).getTime() - getItemDate(b).getTime();
      case "name-asc":
        return a.title.localeCompare(b.title);
      case "name-desc":
        return b.title.localeCompare(a.title);
      case "size-desc":
        return (b.size || 0) - (a.size || 0);
      case "size-asc":
        return (a.size || 0) - (b.size || 0);
      default:
        return 0;
    }
  });
  return sorted;
}

function groupByYearMonth(items: MediaResponse[]): Map<string, Map<string, MediaResponse[]>> {
  const years = new Map<string, Map<string, MediaResponse[]>>();
  items.forEach(item => {
    const date = getItemDate(item);
    const year = format(date, "yyyy");
    const month = format(date, "MMMM");
    if (!years.has(year)) years.set(year, new Map());
    const monthMap = years.get(year)!;
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(item);
  });
  return years;
}

function TimelineView({
  items,
  onPlay,
  onEdit,
  bulkMode,
  selectedIds,
  onToggleSelect,
}: {
  items: MediaResponse[];
  onPlay: (item: MediaResponse) => void;
  onEdit: (item: MediaResponse) => void;
  bulkMode: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}) {
  const grouped = useMemo(() => groupByYearMonth(items), [items]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <MediaGrid items={items} onPlay={onPlay} onEdit={onEdit} />
    );
  }

  const sortedYears = Array.from(grouped.keys()).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-6">
      {sortedYears.map(year => {
        const months = grouped.get(year)!;
        const monthNames = [
          "December", "November", "October", "September", "August", "July",
          "June", "May", "April", "March", "February", "January",
        ];
        const sortedMonths = Array.from(months.keys()).sort(
          (a, b) => monthNames.indexOf(a) - monthNames.indexOf(b)
        );

        return (
          <div key={year} className="space-y-3">
            <h3 className="text-lg font-display font-bold text-foreground" data-testid={`text-timeline-year-${year}`}>
              {year}
            </h3>
            {sortedMonths.map(month => {
              const sectionKey = `${year}-${month}`;
              const monthItems = months.get(month)!;
              const isCollapsed = collapsed.has(sectionKey);

              return (
                <div key={sectionKey} className="glass-card rounded-xl overflow-visible">
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left"
                    data-testid={`button-timeline-toggle-${sectionKey}`}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-medium text-foreground">{month}</span>
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">
                      {monthItems.length}
                    </Badge>
                  </button>
                  {!isCollapsed && (
                    <div className="px-4 pb-4">
                      {bulkMode ? (
                        <BulkMediaGrid
                          items={monthItems}
                          onPlay={onPlay}
                          onEdit={onEdit}
                          selectedIds={selectedIds}
                          onToggleSelect={onToggleSelect}
                        />
                      ) : (
                        <MediaGrid items={monthItems} onPlay={onPlay} onEdit={onEdit} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function BulkMediaGrid({
  items,
  onPlay,
  onEdit,
  selectedIds,
  onToggleSelect,
}: {
  items: MediaResponse[];
  onPlay: (item: MediaResponse) => void;
  onEdit: (item: MediaResponse) => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
      {items.map(item => {
        const isSelected = selectedIds.has(item.id);
        return (
          <div key={item.id} className="relative">
            <div
              className="absolute top-2 left-2 z-20 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(item.id);
              }}
              data-testid={`checkbox-select-${item.id}`}
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-primary" />
              ) : (
                <Square className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className={`transition-opacity ${isSelected ? "ring-2 ring-primary rounded-xl" : ""}`}>
              <MediaGrid
                items={[item]}
                onPlay={onPlay}
                onEdit={onEdit}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CollectionCard({
  collection,
  isActive,
  onClick,
}: {
  collection: CollectionWithCount;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl transition-all min-w-[120px]
        ${isActive
          ? "bg-primary/20 border border-primary/30"
          : "glass-card"
        }
      `}
      data-testid={`button-collection-${collection.id}`}
    >
      <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
        {collection.coverUrl ? (
          <img src={`/objects/${collection.coverUrl}`} alt="" className="w-full h-full object-cover" />
        ) : (
          <FolderOpen className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-foreground truncate max-w-[100px]" data-testid={`text-collection-name-${collection.id}`}>
          {collection.name}
        </p>
        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px] mt-1">
          {collection.itemCount}
        </Badge>
      </div>
    </button>
  );
}

function NewCollectionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createCollection = useCreateCollection();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createCollection.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      toast({ title: "Collection created", description: `"${name}" has been created.` });
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Failed to create collection.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-morphism text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold">New Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="collection-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</Label>
            <Input
              id="collection-name"
              data-testid="input-collection-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Collection"
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collection-description" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</Label>
            <Input
              id="collection-description"
              data-testid="input-collection-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
          </div>
          <Button
            data-testid="button-create-collection"
            onClick={handleCreate}
            disabled={!name.trim() || createCollection.isPending}
            className="w-full bg-primary text-white"
          >
            {createCollection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Collection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulkActionBar({
  selectedIds,
  allItems,
  onSelectAll,
  onDeselectAll,
  onExitBulk,
  collections,
  activeCollectionId,
}: {
  selectedIds: Set<number>;
  allItems: MediaResponse[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExitBulk: () => void;
  collections: CollectionWithCount[];
  activeCollectionId: number | null;
}) {
  const batchUpdate = useBatchUpdateMedia();
  const batchDelete = useBatchDeleteMedia();
  const addToCollection = useAddToCollection();
  const removeFromCollection = useRemoveFromCollection();
  const createCollection = useCreateCollection();
  const { toast } = useToast();
  const haptic = useHaptic();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [showLabelPopover, setShowLabelPopover] = useState(false);
  const [showCollectionPopover, setShowCollectionPopover] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  const ids = Array.from(selectedIds);
  const count = ids.length;

  const handleFavoriteAll = async () => {
    haptic("tap");
    try {
      await batchUpdate.mutateAsync({ ids, updates: { isFavorite: true } });
      toast({ title: "Done", description: `${count} items favorited.` });
    } catch {
      toast({ title: "Error", description: "Failed to favorite items.", variant: "destructive" });
    }
  };

  const handleUnfavoriteAll = async () => {
    haptic("tap");
    try {
      await batchUpdate.mutateAsync({ ids, updates: { isFavorite: false } });
      toast({ title: "Done", description: `${count} items unfavorited.` });
    } catch {
      toast({ title: "Error", description: "Failed to unfavorite items.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    haptic("warning");
    try {
      await batchDelete.mutateAsync(ids);
      toast({ title: "Deleted", description: `${count} items deleted.` });
      onDeselectAll();
    } catch {
      toast({ title: "Error", description: "Failed to delete items.", variant: "destructive" });
    }
    setShowDeleteConfirm(false);
  };

  const handleSetLabel = async () => {
    if (!labelInput.trim()) return;
    haptic("tap");
    try {
      await batchUpdate.mutateAsync({ ids, updates: { label: labelInput.trim() } });
      toast({ title: "Done", description: `Label set on ${count} items.` });
      setLabelInput("");
      setShowLabelPopover(false);
    } catch {
      toast({ title: "Error", description: "Failed to set label.", variant: "destructive" });
    }
  };

  const handleAddToCollection = async (collectionId: number) => {
    haptic("tap");
    try {
      await addToCollection.mutateAsync({ collectionId, mediaItemIds: ids });
      toast({ title: "Done", description: `${count} items added to collection.` });
    } catch {
      toast({ title: "Error", description: "Failed to add to collection.", variant: "destructive" });
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newCollectionName.trim()) return;
    try {
      const result = await createCollection.mutateAsync({ name: newCollectionName.trim() });
      if (result && result.id) {
        await addToCollection.mutateAsync({ collectionId: result.id, mediaItemIds: ids });
        toast({ title: "Done", description: `Created "${newCollectionName}" and added ${count} items.` });
      }
      setNewCollectionName("");
    } catch {
      toast({ title: "Error", description: "Failed to create collection.", variant: "destructive" });
    }
  };

  const handleRemoveFromCollection = async () => {
    if (!activeCollectionId) return;
    haptic("tap");
    try {
      await removeFromCollection.mutateAsync({ collectionId: activeCollectionId, mediaItemIds: ids });
      toast({ title: "Done", description: `${count} items removed from collection.` });
      onDeselectAll();
    } catch {
      toast({ title: "Error", description: "Failed to remove from collection.", variant: "destructive" });
    }
  };

  return (
    <>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 glass-morphism border-t border-white/10 px-4 py-3"
        data-testid="bulk-action-bar"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              {count} selected
            </Badge>
            <Button variant="ghost" size="sm" onClick={onSelectAll} data-testid="button-select-all">
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={onDeselectAll} data-testid="button-deselect-all">
              Deselect All
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavoriteAll}
                  disabled={count === 0 || batchUpdate.isPending}
                  data-testid="button-bulk-favorite"
                >
                  <Heart className="w-4 h-4 mr-1" />
                  Fav All
                </Button>
              </TooltipTrigger>
              <TooltipContent>Favorite all selected</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnfavoriteAll}
                  disabled={count === 0 || batchUpdate.isPending}
                  data-testid="button-bulk-unfavorite"
                >
                  <Heart className="w-4 h-4 mr-1" />
                  Unfav All
                </Button>
              </TooltipTrigger>
              <TooltipContent>Unfavorite all selected</TooltipContent>
            </Tooltip>

            <Popover open={showLabelPopover} onOpenChange={setShowLabelPopover}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" disabled={count === 0} data-testid="button-bulk-label">
                  Set Label
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 glass-morphism" align="end">
                <div className="space-y-3">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Label</Label>
                  <Input
                    data-testid="input-bulk-label"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    placeholder="Enter label..."
                    className="bg-white/5 border-white/10"
                    onKeyDown={(e) => e.key === "Enter" && handleSetLabel()}
                  />
                  <Button size="sm" onClick={handleSetLabel} disabled={!labelInput.trim()} className="w-full" data-testid="button-apply-label">
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={showCollectionPopover} onOpenChange={setShowCollectionPopover}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" disabled={count === 0} data-testid="button-bulk-add-collection">
                  <FolderPlus className="w-4 h-4 mr-1" />
                  Collection
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 glass-morphism" align="end">
                <div className="space-y-3">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Add to Collection</Label>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {collections.map(col => (
                      <button
                        key={col.id}
                        onClick={() => handleAddToCollection(col.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left text-foreground"
                        data-testid={`button-add-to-collection-${col.id}`}
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{col.name}</span>
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px] ml-auto shrink-0">
                          {col.itemCount}
                        </Badge>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-white/10 pt-2 space-y-2">
                    <Input
                      data-testid="input-new-collection-bulk"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="New collection name..."
                      className="bg-white/5 border-white/10 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCreateAndAdd}
                      disabled={!newCollectionName.trim()}
                      className="w-full"
                      data-testid="button-create-add-collection"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Create & Add
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {activeCollectionId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveFromCollection}
                disabled={count === 0 || removeFromCollection.isPending}
                data-testid="button-bulk-remove-from-collection"
              >
                {removeFromCollection.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <X className="w-4 h-4 mr-1" />}
                Remove
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={count === 0}
              data-testid="button-bulk-delete"
            >
              Delete
            </Button>

            <Button variant="ghost" size="sm" onClick={onExitBulk} data-testid="button-exit-bulk">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="glass-morphism text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. These items will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {batchDelete.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function Home() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { data: mediaItems, isLoading: mediaLoading } = useMediaItems();
  const { data: collectionsData } = useCollections();
  const [viewingItem, setViewingItem] = useState<MediaResponse | null>(null);
  const [editingItem, setEditingItem] = useState<MediaResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeCollectionId, setActiveCollectionId] = useState<number | null>(null);
  const [showNewCollectionDialog, setShowNewCollectionDialog] = useState(false);

  const { data: collectionItems } = useCollectionItems(activeCollectionId);

  const collections = collectionsData || [];
  const activeCollection = activeCollectionId
    ? collections.find(c => c.id === activeCollectionId)
    : null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <PinLogin />;
  }

  if (user.mustReset) {
    return <PinReset />;
  }

  const baseItems = activeCollectionId ? (collectionItems || []) : (mediaItems || []);

  let filtered = baseItems;

  if (!activeCollectionId) {
    if (activeFilter === "favorites") {
      filtered = filtered.filter(m => m.isFavorite);
    } else if (activeFilter !== "all") {
      filtered = filtered.filter(m => m.category === activeFilter);
    }
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.label?.toLowerCase().includes(q) ||
      m.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  if (dateFrom) {
    const from = new Date(dateFrom);
    filtered = filtered.filter(m => {
      const d = getItemDate(m);
      return d >= from;
    });
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    filtered = filtered.filter(m => {
      const d = getItemDate(m);
      return d <= to;
    });
  }

  filtered = sortItems(filtered, sortOption);

  const greeting = getGreeting();

  const categoryCounts: Record<string, number> = { all: mediaItems?.length || 0, favorites: 0 };
  mediaItems?.forEach(m => {
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
    if (m.isFavorite) categoryCounts.favorites++;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map(m => m.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const exitBulk = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-40 glass-morphism">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          <a
            href="https://darkwavestudios.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 group shrink-0"
            data-testid="link-home"
          >
            <div className="w-8 h-8 rounded-lg theme-gradient flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <h1 className="font-display font-bold text-lg tracking-tight hidden sm:block group-hover:text-primary transition-colors" data-testid="text-app-title">
              Media Vault
            </h1>
          </a>

          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="relative hidden md:block w-56 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-search"
                placeholder="Search files..."
                className="pl-9 bg-white/5 border-white/10 rounded-full h-9 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1 pl-3 border-l border-white/10">
              <span className="text-sm font-medium hidden lg:block text-muted-foreground mr-1" data-testid="text-greeting">
                {greeting}, {user.name}
              </span>
              <ThemeSwitcher />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="button-logout"
                    variant="ghost"
                    size="icon"
                    onClick={() => logout()}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Sign out</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20 sm:pt-24 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            {activeCollection ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveCollectionId(null)}
                  className="mb-2 -ml-2"
                  data-testid="button-back-to-all"
                >
                  <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
                  Back to all
                </Button>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1" data-testid="text-collection-title">
                  {activeCollection.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "file" : "files"} in collection
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1" data-testid="text-collection-title">
                  Your Vault
                </h2>
                <p className="text-sm text-muted-foreground">
                  {categoryCounts.all} {categoryCounts.all === 1 ? "file" : "files"} secured
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={bulkMode ? "default" : "outline"}
              size="sm"
              onClick={() => bulkMode ? exitBulk() : setBulkMode(true)}
              data-testid="button-toggle-bulk"
              className={bulkMode ? "bg-primary text-white" : ""}
            >
              {bulkMode ? (
                <>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Select
                </>
              )}
            </Button>

            <UploadDialog>
              <Button data-testid="button-upload" className="bg-primary text-white shadow-lg shadow-primary/25 rounded-full gap-2">
                <Plus className="w-4 h-4" />
                Upload
              </Button>
            </UploadDialog>
          </div>
        </div>

        <div className="mb-5 md:hidden relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-mobile"
            placeholder="Search files..."
            className="pl-9 bg-white/5 border-white/10 rounded-full h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {!activeCollectionId && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {FILTER_TABS.map(tab => {
              const isActive = activeFilter === tab.key;
              const count = categoryCounts[tab.key] || 0;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`
                    flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium
                    whitespace-nowrap transition-all duration-200 shrink-0 hover-elevate active-elevate-2
                    ${isActive
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "bg-white/5 text-muted-foreground border border-white/5"
                    }
                  `}
                  data-testid={`button-filter-${tab.key}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-0.5 ${isActive ? "bg-white/20" : "bg-white/10"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {collections.map(col => (
            <CollectionCard
              key={col.id}
              collection={col}
              isActive={activeCollectionId === col.id}
              onClick={() => setActiveCollectionId(activeCollectionId === col.id ? null : col.id)}
            />
          ))}
          <button
            onClick={() => setShowNewCollectionDialog(true)}
            className="shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl glass-card min-w-[120px]"
            data-testid="button-new-collection"
          >
            <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center border border-dashed border-white/20">
              <FolderPlus className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">New Collection</p>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-lg overflow-visible glass-card">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`rounded-r-none ${viewMode === "grid" ? "bg-primary/20 text-primary" : ""}`}
                data-testid="button-view-grid"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("timeline")}
                className={`rounded-l-none ${viewMode === "timeline" ? "bg-primary/20 text-primary" : ""}`}
                data-testid="button-view-timeline"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10" data-testid="select-sort">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-morphism">
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`sort-option-${opt.value}`}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <CalendarRange className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[140px] bg-white/5 border-white/10 text-sm"
              data-testid="input-date-from"
              placeholder="From"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[140px] bg-white/5 border-white/10 text-sm"
              data-testid="input-date-to"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                data-testid="button-clear-dates"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {mediaLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl overflow-hidden glass-card">
                <div className="aspect-[4/3] shimmer" />
                <div className="p-3 sm:p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded shimmer" />
                  <div className="h-3 w-1/2 rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === "timeline" ? (
          <TimelineView
            items={filtered}
            onPlay={setViewingItem}
            onEdit={setEditingItem}
            bulkMode={bulkMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        ) : bulkMode ? (
          <BulkMediaGrid
            items={filtered}
            onPlay={setViewingItem}
            onEdit={setEditingItem}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        ) : (
          <MediaGrid
            items={filtered}
            onPlay={setViewingItem}
            onEdit={setEditingItem}
          />
        )}
      </main>

      {!bulkMode && (
        <div className="fixed bottom-4 right-4 sm:hidden z-30">
          <UploadDialog>
            <Button size="icon" data-testid="button-upload-fab" className="rounded-full bg-primary text-white shadow-xl shadow-primary/30">
              <Plus className="w-5 h-5" />
            </Button>
          </UploadDialog>
        </div>
      )}

      <AnimatePresence>
        {bulkMode && (
          <BulkActionBar
            selectedIds={selectedIds}
            allItems={filtered}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onExitBulk={exitBulk}
            collections={collections}
            activeCollectionId={activeCollectionId}
          />
        )}
      </AnimatePresence>

      <MediaViewer
        item={viewingItem}
        open={!!viewingItem}
        onOpenChange={(open) => !open && setViewingItem(null)}
      />

      <EditMediaDialog
        item={editingItem}
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      />

      <NewCollectionDialog
        open={showNewCollectionDialog}
        onOpenChange={setShowNewCollectionDialog}
      />
    </div>
  );
}


function PinLogin() {
  const { login, isLoggingIn, loginError } = useAuth();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [shake, setShake] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    try {
      await login(pin);
    } catch (err: any) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setPin("");
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter" && pin.length >= 4) {
        handleSubmit(e as any);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="relative w-full md:w-1/2 lg:w-3/5 h-[40vh] md:h-screen overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-background to-background opacity-80" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen" />

        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-10 bg-gradient-to-t from-black via-transparent to-transparent">
          <div className="max-w-md">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4 leading-tight">
              Your digital assets,<br />
              <span className="theme-gradient-text">
                secured forever.
              </span>
            </h2>
            <p className="text-white/60 text-lg hidden md:block">
              A private vault for your most valuable media and memories.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col items-center justify-center p-8 bg-card border-l border-white/5">
        <div className="max-w-xs w-full space-y-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl theme-gradient flex items-center justify-center mb-6 mx-auto shadow-lg shadow-primary/20">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight mb-1" data-testid="text-login-title">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Enter your PIN to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <div
                className={`flex items-center justify-center gap-2 transition-transform ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-2 transition-all duration-200 ${
                      i < pin.length
                        ? "bg-primary border-primary scale-110"
                        : i < 4
                        ? "border-white/20"
                        : "border-white/10"
                    }`}
                  />
                ))}
              </div>

              {loginError && (
                <p className="text-center text-sm text-destructive" data-testid="text-login-error">
                  Incorrect PIN. Try again.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <Button
                  key={digit}
                  type="button"
                  variant="outline"
                  data-testid={`button-digit-${digit}`}
                  className="h-14 text-xl font-medium border-white/10 bg-white/5"
                  onClick={() => handleDigit(String(digit))}
                  disabled={isLoggingIn}
                >
                  {digit}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                data-testid="button-toggle-pin-visibility"
                className="h-14 border-white/10 bg-white/5"
                onClick={() => setShowPin(!showPin)}
                disabled={isLoggingIn}
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="button-digit-0"
                className="h-14 text-xl font-medium border-white/10 bg-white/5"
                onClick={() => handleDigit("0")}
                disabled={isLoggingIn}
              >
                0
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="button-backspace"
                className="h-14 border-white/10 bg-white/5 text-muted-foreground"
                onClick={handleBackspace}
                disabled={isLoggingIn}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
              </Button>
            </div>

            {showPin && pin.length > 0 && (
              <p className="text-center text-sm text-muted-foreground font-mono tracking-[0.5em]">{pin}</p>
            )}

            <Button
              type="submit"
              data-testid="button-login-submit"
              disabled={pin.length < 4 || isLoggingIn}
              className="w-full h-12 text-base font-medium bg-primary text-white rounded-lg"
            >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Unlock"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}


function PinReset() {
  const { resetPin, isResettingPin, resetPinError } = useAuth();
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"new" | "confirm">("new");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const activePin = step === "new" ? newPin : confirmPin;
  const setActivePin = step === "new" ? setNewPin : setConfirmPin;

  const handleDigit = (digit: string) => {
    if (activePin.length < 8) {
      setActivePin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setActivePin(prev => prev.slice(0, -1));
  };

  const handleContinue = () => {
    if (step === "new") {
      if (newPin.length < 4) return;
      setStep("confirm");
      setError("");
    }
  };

  const handleSubmit = async () => {
    if (newPin !== confirmPin) {
      setError("PINs don't match. Try again.");
      setConfirmPin("");
      return;
    }

    try {
      await resetPin(newPin);
      toast({
        title: "PIN Updated",
        description: "Your new PIN has been set successfully.",
      });
    } catch (err: any) {
      setError(err.message || "Failed to update PIN");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter") {
        if (step === "new" && newPin.length >= 4) {
          handleContinue();
        } else if (step === "confirm" && confirmPin.length >= 4) {
          handleSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [newPin, confirmPin, step]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-xs w-full space-y-8">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl theme-gradient flex items-center justify-center mb-6 mx-auto shadow-lg shadow-primary/20">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight mb-1" data-testid="text-reset-title">
            {step === "new" ? "Set Your New PIN" : "Confirm Your PIN"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === "new"
              ? "Choose a 4-8 digit PIN you'll remember"
              : "Enter the same PIN again to confirm"
            }
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 transition-all duration-200 ${
                    i < activePin.length
                      ? "bg-primary border-primary scale-110"
                      : i < 4
                      ? "border-white/20"
                      : "border-white/10"
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-sm text-destructive" data-testid="text-reset-error">{error}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <Button
                key={digit}
                type="button"
                variant="outline"
                className="h-14 text-xl font-medium border-white/10 bg-white/5"
                onClick={() => handleDigit(String(digit))}
                disabled={isResettingPin}
              >
                {digit}
              </Button>
            ))}
            <div />
            <Button
              type="button"
              variant="outline"
              className="h-14 text-xl font-medium border-white/10 bg-white/5"
              onClick={() => handleDigit("0")}
              disabled={isResettingPin}
            >
              0
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-14 border-white/10 bg-white/5 text-muted-foreground"
              onClick={handleBackspace}
              disabled={isResettingPin}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
            </Button>
          </div>

          {step === "new" ? (
            <Button
              data-testid="button-pin-continue"
              disabled={newPin.length < 4 || isResettingPin}
              className="w-full h-12 text-base font-medium bg-primary text-white rounded-lg"
              onClick={handleContinue}
            >
              Continue
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-12 border-white/10"
                onClick={() => { setStep("new"); setConfirmPin(""); setError(""); }}
                disabled={isResettingPin}
              >
                Back
              </Button>
              <Button
                data-testid="button-pin-confirm"
                disabled={confirmPin.length < 4 || isResettingPin}
                className="flex-1 h-12 text-base font-medium bg-primary text-white rounded-lg"
                onClick={handleSubmit}
              >
                {isResettingPin ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Set PIN"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
