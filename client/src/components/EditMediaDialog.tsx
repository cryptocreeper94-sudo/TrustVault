import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUpdateMedia } from "@/hooks/use-media";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MediaResponse } from "@shared/routes";

interface EditMediaDialogProps {
  item: MediaResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMediaDialog({ item, open, onOpenChange }: EditMediaDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [label, setLabel] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const updateMedia = useUpdateMedia();
  const { toast } = useToast();

  useEffect(() => {
    if (item && open) {
      setTitle(item.title);
      setDescription(item.description || "");
      setLabel(item.label || "");
      setTags(item.tags || []);
      setTagInput("");
    }
  }, [item, open]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    try {
      await updateMedia.mutateAsync({
        id: item.id,
        updates: {
          title,
          description: description || undefined,
          label: label || undefined,
          tags: tags.length > 0 ? tags : undefined,
        },
      });
      toast({ title: "Updated", description: "Changes saved." });
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto glass-morphism text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold">Edit Details</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input
              id="edit-title"
              data-testid="input-edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-primary/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-label" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Label</Label>
            <Input
              id="edit-label"
              data-testid="input-edit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Concert, Demo, Draft"
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tags" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="edit-tags"
                data-testid="input-edit-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type and press Enter"
                className="bg-white/5 border-white/10 focus:border-primary/50 flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag} disabled={!tagInput.trim()} className="border-white/10">Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                    {tag}
                    <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="ml-0.5 rounded-full p-0.5 hover:bg-white/10">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea
              id="edit-description"
              data-testid="input-edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context..."
              className="bg-white/5 border-white/10 focus:border-primary/50 min-h-[80px] resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" data-testid="button-save-edit" disabled={!title || updateMedia.isPending} className="bg-primary text-white min-w-[80px]">
              {updateMedia.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
