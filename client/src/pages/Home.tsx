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
  Check, CheckSquare, Square, ArrowUpDown, CalendarRange, X, Layers,
  UserPlus, BookOpen, Menu, ExternalLink, Globe, Zap, CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
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
          <div className="flex items-center gap-2 flex-wrap overflow-x-auto">
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
  const { user, isLoading: authLoading, isLoadingStatus, accountExists, logout } = useAuth();
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
  const [showChangePassword, setShowChangePassword] = useState(false);

  const { data: collectionItems } = useCollectionItems(activeCollectionId);

  const collections = collectionsData || [];
  const activeCollection = activeCollectionId
    ? collections.find(c => c.id === activeCollectionId)
    : null;

  if (authLoading || isLoadingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user && !accountExists) {
    return <AccountSetup />;
  }

  if (!user) {
    return <PasswordLogin />;
  }

  if (user.mustReset) {
    return <PasswordReset />;
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
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    data-testid="button-hamburger-menu"
                    variant="ghost"
                    size="icon"
                  >
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="flex flex-col">
                  <SheetHeader className="text-left">
                    <SheetTitle className="font-display flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg theme-gradient flex items-center justify-center">
                        <Shield className="w-3.5 h-3.5 text-white" />
                      </div>
                      DW Media Studio
                    </SheetTitle>
                    <p className="text-xs text-muted-foreground">
                      {greeting}, {user.name}
                    </p>
                  </SheetHeader>

                  <Separator className="my-2" />

                  <nav className="flex flex-col gap-1" data-testid="nav-hamburger-menu">
                    <a href="/" className="w-full">
                      <Button variant="ghost" className="w-full justify-start gap-3" data-testid="nav-link-vault">
                        <LayoutGrid className="w-4 h-4" />
                        Media Vault
                      </Button>
                    </a>
                    <a href="/blog" className="w-full">
                      <Button variant="ghost" className="w-full justify-start gap-3" data-testid="nav-link-blog">
                        <Globe className="w-4 h-4" />
                        Blog
                      </Button>
                    </a>
                    <a href="/blog/admin" className="w-full">
                      <Button variant="ghost" className="w-full justify-start gap-3" data-testid="nav-link-blog-admin">
                        <BookOpen className="w-4 h-4" />
                        Blog Manager
                      </Button>
                    </a>
                    <a href="/pricing" className="w-full">
                      <Button variant="ghost" className="w-full justify-start gap-3" data-testid="nav-link-pricing">
                        <CreditCard className="w-4 h-4" />
                        Pricing & Plans
                      </Button>
                    </a>
                  </nav>

                  <Separator className="my-2" />

                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => setShowChangePassword(true)}
                      data-testid="nav-link-change-password"
                    >
                      <KeyRound className="w-4 h-4" />
                      Change Password
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => logout()}
                      data-testid="nav-link-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </div>

                  <div className="mt-auto pt-6">
                    <Separator className="mb-4" />
                    <div className="space-y-3">
                      <a
                        href="https://dwtl.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground group"
                        data-testid="link-trustlayer"
                      >
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <span>Trust Layer</span>
                        <span className="text-xs text-muted-foreground/60">dwtl.io</span>
                        <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <a
                        href="https://darkwavestudios.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground group"
                        data-testid="link-darkwavestudios"
                      >
                        <Shield className="w-3.5 h-3.5 text-primary" />
                        <span>Dark Wave Studios</span>
                        <span className="text-xs text-muted-foreground/60">.io</span>
                        <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-[11px] text-muted-foreground/50 text-center">
                          Powered by <a href="https://trustshield.tech" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/70 hover:text-primary transition-colors" data-testid="link-trustshield">TrustShield.tech</a>
                        </p>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
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

            <Link href="/merge">
              <Button data-testid="button-merge" variant="outline" className="rounded-full gap-2">
                <Layers className="w-4 h-4" />
                Merge
              </Button>
            </Link>

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

        <div className="flex flex-col gap-3 mb-5">
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
              <SelectTrigger className="w-[140px] sm:w-[180px] bg-white/5 border-white/10" data-testid="select-sort">
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
              className="w-[120px] sm:w-[140px] bg-white/5 border-white/10 text-sm"
              data-testid="input-date-from"
              placeholder="From"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[120px] sm:w-[140px] bg-white/5 border-white/10 text-sm"
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

      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />
    </div>
  );
}


function PasswordLogin() {
  const { login, isLoggingIn, loginError, accountCount } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const multiUser = accountCount > 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    if (multiUser && !name.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }
    setErrorMsg("");

    try {
      await login({ name: multiUser ? name.trim() : undefined, password });
    } catch (err: any) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setErrorMsg(err.message || "Incorrect password. Try again.");
      setPassword("");
    }
  };

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
        <div className="max-w-sm w-full space-y-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl theme-gradient flex items-center justify-center mb-6 mx-auto shadow-lg shadow-primary/20">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight mb-1" data-testid="text-login-title">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">
              {multiUser ? "Enter your name and password to continue" : "Enter your password to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className={`space-y-3 transition-transform ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
              {multiUser && (
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="pl-10 h-12 text-base bg-white/5 border-white/10"
                    data-testid="input-login-name"
                    autoFocus
                    disabled={isLoggingIn}
                  />
                </div>
              )}
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-10 pr-10 h-12 text-base bg-white/5 border-white/10"
                  data-testid="input-password"
                  autoFocus={!multiUser}
                  disabled={isLoggingIn}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password-visibility"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              {(loginError || errorMsg) && (
                <p className="text-center text-sm text-destructive" data-testid="text-login-error">
                  {errorMsg || "Incorrect credentials. Try again."}
                </p>
              )}
            </div>

            <Button
              type="submit"
              data-testid="button-login-submit"
              disabled={password.length < 1 || isLoggingIn}
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


function PasswordReset() {
  const { resetPassword, isResettingPassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"new" | "confirm">("new");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword);
  const isValid = hasMinLength && hasUppercase && hasSpecialChar;

  const handleContinue = () => {
    if (!isValid) return;
    setStep("confirm");
    setError("");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match. Try again.");
      setConfirmPassword("");
      return;
    }

    try {
      await resetPassword(newPassword);
      toast({
        title: "Password Set",
        description: "Your new password has been set successfully.",
      });
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl theme-gradient flex items-center justify-center mb-6 mx-auto shadow-lg shadow-primary/20">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight mb-1" data-testid="text-reset-title">
            {step === "new" ? "Set Your Password" : "Confirm Password"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === "new"
              ? "Create a strong password for your vault"
              : "Enter the same password again to confirm"
            }
          </p>
        </div>

        <form onSubmit={step === "confirm" ? handleSubmit : (e) => { e.preventDefault(); handleContinue(); }} className="space-y-6">
          {step === "new" ? (
            <div className="space-y-4">
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="pl-10 pr-10 h-12 text-base bg-white/5 border-white/10"
                  data-testid="input-new-password"
                  autoFocus
                  disabled={isResettingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-new-password-visibility"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              <div className="space-y-2 px-1">
                <div className="flex items-center gap-2">
                  {hasMinLength ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={`text-sm ${hasMinLength ? "text-green-500" : "text-muted-foreground"}`}>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasUppercase ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={`text-sm ${hasUppercase ? "text-green-500" : "text-muted-foreground"}`}>At least 1 uppercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasSpecialChar ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={`text-sm ${hasSpecialChar ? "text-green-500" : "text-muted-foreground"}`}>At least 1 special character (!@#$...)</span>
                </div>
              </div>

              {error && (
                <p className="text-center text-sm text-destructive" data-testid="text-reset-error">{error}</p>
              )}

              <Button
                type="submit"
                data-testid="button-password-continue"
                disabled={!isValid || isResettingPassword}
                className="w-full h-12 text-base font-medium bg-primary text-white rounded-lg"
              >
                Continue
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="pl-10 pr-10 h-12 text-base bg-white/5 border-white/10"
                  data-testid="input-confirm-password"
                  autoFocus
                  disabled={isResettingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-confirm-password-visibility"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              {error && (
                <p className="text-center text-sm text-destructive" data-testid="text-reset-error">{error}</p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 border-white/10"
                  onClick={() => { setStep("new"); setConfirmPassword(""); setError(""); }}
                  disabled={isResettingPassword}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  data-testid="button-password-confirm"
                  disabled={confirmPassword.length < 8 || isResettingPassword}
                  className="flex-1 h-12 text-base font-medium bg-primary text-white rounded-lg"
                >
                  {isResettingPassword ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Set Password"
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}


function AccountSetup() {
  const { setup, isSettingUp, setupError } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"name" | "password" | "confirm">("name");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasSpecialChar;

  const handleNameContinue = () => {
    if (!name.trim()) return;
    setStep("password");
  };

  const handlePasswordContinue = () => {
    if (!isPasswordValid) return;
    setStep("confirm");
    setError("");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match. Try again.");
      setConfirmPassword("");
      return;
    }

    try {
      await setup({ name: name.trim(), password });
      toast({
        title: "Account Created",
        description: `Welcome to your vault, ${name.trim()}!`,
      });
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    }
  };

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
        <div className="max-w-sm w-full space-y-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl theme-gradient flex items-center justify-center mb-6 mx-auto shadow-lg shadow-primary/20">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight mb-1" data-testid="text-setup-title">
              {step === "name" ? "Create Your Account" : step === "password" ? "Set Your Password" : "Confirm Password"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === "name"
                ? "What should we call you?"
                : step === "password"
                  ? "Create a strong password for your vault"
                  : "Enter the same password again to confirm"
              }
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step === "name") handleNameContinue();
              else if (step === "password") handlePasswordContinue();
              else handleSubmit();
            }}
            className="space-y-6"
          >
            {step === "name" && (
              <div className="space-y-4">
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="pl-10 h-12 text-base bg-white/5 border-white/10"
                    data-testid="input-setup-name"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  data-testid="button-setup-name-continue"
                  disabled={!name.trim()}
                  className="w-full h-12 text-base font-medium bg-primary text-white rounded-lg"
                >
                  Continue
                </Button>
              </div>
            )}

            {step === "password" && (
              <div className="space-y-4">
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    className="pl-10 pr-10 h-12 text-base bg-white/5 border-white/10"
                    data-testid="input-setup-password"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-setup-password-visibility"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="space-y-2 px-1">
                  <div className="flex items-center gap-2">
                    {hasMinLength ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className={`text-sm ${hasMinLength ? "text-green-500" : "text-muted-foreground"}`}>At least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUppercase ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className={`text-sm ${hasUppercase ? "text-green-500" : "text-muted-foreground"}`}>At least 1 uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasSpecialChar ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className={`text-sm ${hasSpecialChar ? "text-green-500" : "text-muted-foreground"}`}>At least 1 special character (!@#$...)</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 border-white/10"
                    onClick={() => setStep("name")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    data-testid="button-setup-password-continue"
                    disabled={!isPasswordValid}
                    className="flex-1 h-12 text-base font-medium bg-primary text-white rounded-lg"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-4">
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="pl-10 pr-10 h-12 text-base bg-white/5 border-white/10"
                    data-testid="input-setup-confirm-password"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>

                {error && (
                  <p className="text-center text-sm text-destructive" data-testid="text-setup-error">{error}</p>
                )}
                {setupError && (
                  <p className="text-center text-sm text-destructive" data-testid="text-setup-error">{setupError.message}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 border-white/10"
                    onClick={() => { setStep("password"); setConfirmPassword(""); setError(""); }}
                    disabled={isSettingUp}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    data-testid="button-setup-create"
                    disabled={confirmPassword.length < 8 || isSettingUp}
                    className="flex-1 h-12 text-base font-medium bg-primary text-white rounded-lg"
                  >
                    {isSettingUp ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}


function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { changePassword, isChangingPassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword);
  const isValid = hasMinLength && hasUppercase && hasSpecialChar;

  const handleReset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setError("");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) handleReset();
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      handleClose(false);
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md glass-morphism text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold" data-testid="text-change-password-title">Change Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pr-10 bg-white/5 border-white/10"
                data-testid="input-current-password"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-10 bg-white/5 border-white/10"
                data-testid="input-new-password-change"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2 px-1">
            <div className="flex items-center gap-2">
              {hasMinLength ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-muted-foreground shrink-0" />}
              <span className={`text-sm ${hasMinLength ? "text-green-500" : "text-muted-foreground"}`}>At least 8 characters</span>
            </div>
            <div className="flex items-center gap-2">
              {hasUppercase ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-muted-foreground shrink-0" />}
              <span className={`text-sm ${hasUppercase ? "text-green-500" : "text-muted-foreground"}`}>At least 1 uppercase letter</span>
            </div>
            <div className="flex items-center gap-2">
              {hasSpecialChar ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-muted-foreground shrink-0" />}
              <span className={`text-sm ${hasSpecialChar ? "text-green-500" : "text-muted-foreground"}`}>At least 1 special character (!@#$...)</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirm New Password</Label>
            <Input
              type={showNew ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="bg-white/5 border-white/10"
              data-testid="input-confirm-new-password"
            />
          </div>

          {error && (
            <p className="text-center text-sm text-destructive" data-testid="text-change-password-error">{error}</p>
          )}

          <Button
            type="submit"
            data-testid="button-change-password-submit"
            disabled={!currentPassword || !isValid || confirmPassword.length < 8 || isChangingPassword}
            className="w-full bg-primary text-white"
          >
            {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
