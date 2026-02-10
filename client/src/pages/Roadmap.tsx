import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ThumbsUp,
  Plus,
  Music,
  Lightbulb,
  MessageSquare,
  Shield,
  ChevronUp,
  Send,
  Loader2,
  Upload,
  ListMusic,
  Info,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FeatureRequest } from "@shared/schema";

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Music }> = {
  music_services: { label: "Music Services", icon: Music },
  media_tools: { label: "Media Tools", icon: Sparkles },
  storage: { label: "Storage", icon: Upload },
  social: { label: "Social / Sharing", icon: MessageSquare },
  integrations: { label: "Integrations", icon: Lightbulb },
  other: { label: "Other", icon: Info },
};

const STATUS_STYLES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "Open", variant: "secondary" },
  under_review: { label: "Under Review", variant: "outline" },
  planned: { label: "Planned", variant: "default" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  declined: { label: "Declined", variant: "destructive" },
};

export default function Roadmap() {
  const { toast } = useToast();
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("other");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: features = [], isLoading } = useQuery<FeatureRequest[]>({
    queryKey: ["/api/features"],
  });

  const { data: myVotes = [] } = useQuery<number[]>({
    queryKey: ["/api/features/my-votes"],
  });

  const voteMutation = useMutation({
    mutationFn: async (featureId: number) => {
      const res = await apiRequest("POST", `/api/features/${featureId}/vote`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      queryClient.invalidateQueries({ queryKey: ["/api/features/my-votes"] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; category: string }) => {
      const res = await apiRequest("POST", "/api/features", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      setNewTitle("");
      setNewDescription("");
      setNewCategory("other");
      setShowSubmitForm(false);
      toast({ title: "Request submitted", description: "Your feature request has been submitted. Thanks for helping shape the platform!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit request. Please try again.", variant: "destructive" });
    },
  });

  const filteredFeatures = filterCategory === "all"
    ? features
    : features.filter(f => f.category === filterCategory);

  return (
    <>
      <Helmet>
        <title>Community Voice | TrustVault Feature Requests</title>
        <meta name="description" content="Vote on features and help shape the future of TrustVault. Your voice matters in building the ultimate media vault." />
        <meta property="og:title" content="Community Voice | TrustVault" />
        <meta property="og:description" content="Vote on features and help shape the future of TrustVault." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3 p-4 max-w-4xl mx-auto">
            <Button asChild variant="ghost" size="icon" data-testid="button-back-home">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Community Voice</h1>
              <p className="text-xs text-muted-foreground">Help shape the future of TrustVault</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowSubmitForm(!showSubmitForm)}
              data-testid="button-toggle-submit"
            >
              {showSubmitForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {showSubmitForm ? "Cancel" : "Request"}
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h2 className="font-semibold">About Music & Media in Your Vault</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You can <strong>upload and store</strong> all your own music files, videos, images, and documents in your vault. 
                    Organize them into <strong>playlists and collections</strong>, tag them, and access them from any device.
                  </p>
                  <Separator className="my-3" />
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <strong>Why we don't offer music downloads from external services yet:</strong> Connecting to services like Spotify or Apple Music for downloading requires proper copyright licensing and legal agreements. We're committed to doing this the right way — not cutting corners. Your votes here help us build the case to bring on the right legal team and make it happen properly.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <ListMusic className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h2 className="font-semibold">What You Can Do Right Now</h2>
                  <ul className="text-sm text-muted-foreground space-y-1.5 list-none">
                    <li className="flex items-start gap-2">
                      <Upload className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span><strong>Upload your music</strong> — MP3, WAV, FLAC, AAC and more</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ListMusic className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span><strong>Create playlists</strong> — Use Collections to group and organize your tracks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span><strong>Edit & enhance</strong> — Trim, adjust, and apply effects to your audio</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span><strong>All media types supported</strong> — Videos, images, documents, and more</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>

          <AnimatePresence>
            {showSubmitForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="p-5 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Submit a Feature Request
                  </h3>
                  <Input
                    placeholder="Feature title (e.g., 'SoundCloud Integration')"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    data-testid="input-feature-title"
                  />
                  <Textarea
                    placeholder="Describe what you'd like to see and why it would be valuable..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="min-h-[100px]"
                    data-testid="input-feature-description"
                  />
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger data-testid="select-feature-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => submitMutation.mutate({ title: newTitle, description: newDescription, category: newCategory })}
                    disabled={!newTitle.trim() || !newDescription.trim() || submitMutation.isPending}
                    className="w-full"
                    data-testid="button-submit-feature"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Request
                  </Button>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold">Feature Requests</h2>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-5 animate-pulse">
                    <div className="h-5 bg-muted rounded w-2/3 mb-3" />
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </Card>
                ))}
              </div>
            ) : filteredFeatures.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {filterCategory !== "all" ? "No feature requests in this category yet." : "No feature requests yet. Be the first to submit one!"}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredFeatures.map((feature, index) => {
                  const hasVoted = myVotes.includes(feature.id);
                  const catInfo = CATEGORY_LABELS[feature.category] || CATEGORY_LABELS.other;
                  const statusInfo = STATUS_STYLES[feature.status] || STATUS_STYLES.open;
                  const CatIcon = catInfo.icon;

                  return (
                    <motion.div
                      key={feature.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="p-4">
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              variant={hasVoted ? "default" : "outline"}
                              size="icon"
                              onClick={() => voteMutation.mutate(feature.id)}
                              disabled={voteMutation.isPending}
                              data-testid={`button-vote-${feature.id}`}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <span className={`text-sm font-semibold ${hasVoted ? "text-primary" : "text-muted-foreground"}`} data-testid={`text-votes-${feature.id}`}>
                              {feature.votes}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <h3 className="font-medium text-sm leading-tight" data-testid={`text-feature-title-${feature.id}`}>
                                {feature.title}
                              </h3>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant={statusInfo.variant} className="text-xs">
                                  {statusInfo.label}
                                </Badge>
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {feature.description}
                            </p>

                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs gap-1">
                                <CatIcon className="h-3 w-3" />
                                {catInfo.label}
                              </Badge>
                              {feature.submittedBy && (
                                <span className="text-xs text-muted-foreground">
                                  by {feature.submittedBy}
                                </span>
                              )}
                            </div>

                            {feature.adminNote && (
                              <div className="mt-2 p-2.5 rounded-md bg-muted/50 border border-border/50">
                                <p className="text-xs text-muted-foreground">
                                  <strong>Team note:</strong> {feature.adminNote}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <Card className="p-5">
            <div className="text-center space-y-2">
              <ThumbsUp className="h-6 w-6 text-primary mx-auto" />
              <h3 className="font-semibold text-sm">Your Voice Matters</h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                Every vote helps us prioritize what to build next. For features that require legal review (like music service integration), 
                strong community interest helps us justify bringing on the right professionals to make it happen properly.
              </p>
            </div>
          </Card>
        </main>
      </div>
    </>
  );
}
