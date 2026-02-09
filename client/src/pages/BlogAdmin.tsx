import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Sparkles, Trash2, Edit, Eye, ArrowLeft,
  Send, Loader2, FileText, Globe, Archive, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BlogPost } from "@shared/schema";

const STATUS_ICONS: Record<string, typeof FileText> = {
  draft: FileText,
  published: Globe,
  archived: Archive,
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BlogAdmin() {
  const { toast } = useToast();
  const [showEditor, setShowEditor] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("draft");

  const [genTopic, setGenTopic] = useState("");
  const [genTone, setGenTone] = useState("professional");
  const [genKeywords, setGenKeywords] = useState("");

  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts/all"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/blog/posts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      toast({ title: "Post created" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create post", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/blog/posts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      toast({ title: "Post updated" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update post", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/blog/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      toast({ title: "Post deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete post", description: err.message, variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/blog/generate", data);
      return res.json();
    },
    onSuccess: (generated: any) => {
      setTitle(generated.title || "");
      setContent(generated.content || "");
      setExcerpt(generated.excerpt || "");
      setMetaDescription(generated.metaDescription || "");
      setKeywords((generated.keywords || []).join(", "));
      setCategory(generated.category || "");
      setStatus("draft");
      setShowGenerator(false);
      setShowEditor(true);
      toast({ title: "Content generated! Review and publish when ready." });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setTitle("");
    setContent("");
    setExcerpt("");
    setMetaDescription("");
    setKeywords("");
    setCategory("");
    setStatus("draft");
    setEditingPost(null);
    setShowEditor(false);
  }

  function openEditor(post?: BlogPost) {
    if (post) {
      setEditingPost(post);
      setTitle(post.title);
      setContent(post.content);
      setExcerpt(post.excerpt || "");
      setMetaDescription(post.metaDescription || "");
      setKeywords((post.keywords || []).join(", "));
      setCategory(post.category || "");
      setStatus(post.status);
    } else {
      resetForm();
    }
    setShowEditor(true);
  }

  function handleSave() {
    const keywordsList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const data = {
      title,
      content,
      excerpt: excerpt || undefined,
      metaDescription: metaDescription || undefined,
      keywords: keywordsList.length > 0 ? keywordsList : undefined,
      category: category || undefined,
      status,
    };
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleGenerate() {
    const kwList = genKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    generateMutation.mutate({
      topic: genTopic,
      tone: genTone,
      targetKeywords: kwList.length > 0 ? kwList : undefined,
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back-vault">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Vault
            </Button>
          </Link>
          <h1 className="text-xl font-bold font-[var(--font-display)]" data-testid="text-admin-title">
            Blog Manager
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGenerator(true)}
              data-testid="button-ai-generate"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              AI Generate
            </Button>
            <Button
              size="sm"
              onClick={() => openEditor()}
              data-testid="button-new-post"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Post
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="h-5 w-1/2 shimmer rounded mb-2" />
                <div className="h-4 w-1/3 shimmer rounded" />
              </Card>
            ))}
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-lg mb-4" data-testid="text-empty-state">
              No blog posts yet
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setShowGenerator(true)} data-testid="button-ai-generate-empty">
                <Sparkles className="w-4 h-4 mr-1" />
                Generate with AI
              </Button>
              <Button onClick={() => openEditor()} data-testid="button-new-post-empty">
                <Plus className="w-4 h-4 mr-1" />
                Write Manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {posts.map((post) => {
                const StatusIcon = STATUS_ICONS[post.status] || FileText;
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card className="p-4 flex items-center justify-between gap-4 flex-wrap" data-testid={`card-admin-post-${post.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <StatusIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <h3 className="font-semibold truncate" data-testid={`text-admin-title-${post.id}`}>{post.title}</h3>
                          <Badge
                            variant={post.status === "published" ? "default" : "secondary"}
                            className="text-xs"
                            data-testid={`badge-status-${post.id}`}
                          >
                            {post.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {post.category && <span className="mr-3">{post.category}</span>}
                          {post.publishedAt
                            ? `Published ${formatDate(post.publishedAt as unknown as string)}`
                            : `Created ${formatDate(post.createdAt as unknown as string)}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {post.status === "published" && (
                          <Link href={`/blog/${post.slug}`}>
                            <Button size="icon" variant="ghost" data-testid={`button-view-${post.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditor(post)}
                          data-testid={`button-edit-${post.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete this post?")) {
                              deleteMutation.mutate(post.id);
                            }
                          }}
                          data-testid={`button-delete-${post.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      <Dialog open={showEditor} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-editor-title">
              {editingPost ? "Edit Post" : "New Post"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="post-title">Title</Label>
              <Input
                id="post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                data-testid="input-post-title"
              />
            </div>
            <div>
              <Label htmlFor="post-excerpt">Excerpt</Label>
              <Input
                id="post-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief teaser for the post"
                data-testid="input-post-excerpt"
              />
            </div>
            <div>
              <Label htmlFor="post-meta">Meta Description (SEO)</Label>
              <Input
                id="post-meta"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="SEO meta description (155 chars)"
                maxLength={160}
                data-testid="input-post-meta"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="post-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="media-management">Media Management</SelectItem>
                    <SelectItem value="video-production">Video Production</SelectItem>
                    <SelectItem value="audio-production">Audio Production</SelectItem>
                    <SelectItem value="creative-tools">Creative Tools</SelectItem>
                    <SelectItem value="industry-insights">Industry Insights</SelectItem>
                    <SelectItem value="tutorials">Tutorials</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="post-status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="post-keywords">Keywords (comma-separated)</Label>
              <Input
                id="post-keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="keyword1, keyword2, keyword3"
                data-testid="input-post-keywords"
              />
            </div>
            <div>
              <Label htmlFor="post-content">Content (HTML)</Label>
              <Textarea
                id="post-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content here (HTML supported)"
                className="min-h-[300px] font-mono text-sm"
                data-testid="textarea-post-content"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel-editor">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!title || !content || isSaving}
                data-testid="button-save-post"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {editingPost ? "Update" : "Create"} Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-generator-title">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Blog Generator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="gen-topic">Topic / Subject</Label>
              <Textarea
                id="gen-topic"
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                placeholder="e.g., Best practices for organizing digital media collections in 2026"
                className="min-h-[80px]"
                data-testid="textarea-gen-topic"
              />
            </div>
            <div>
              <Label htmlFor="gen-tone">Writing Tone</Label>
              <Select value={genTone} onValueChange={setGenTone}>
                <SelectTrigger data-testid="select-gen-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gen-keywords">Target SEO Keywords (optional, comma-separated)</Label>
              <Input
                id="gen-keywords"
                value={genKeywords}
                onChange={(e) => setGenKeywords(e.target.value)}
                placeholder="media vault, digital asset management, creative workflow"
                data-testid="input-gen-keywords"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={!genTopic || generateMutation.isPending}
              data-testid="button-generate"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Generate Blog Post
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
