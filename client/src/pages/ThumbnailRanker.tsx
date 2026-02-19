import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Loader2, Check, Trophy, Medal, Award, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { InfoBubble } from "@/components/InfoBubble";
import type { MediaItem } from "@shared/schema";

interface RankingResult {
  mediaId: number;
  imageUrl: string;
  overallScore: number;
  composition: number;
  colorImpact: number;
  emotionalAppeal: number;
  attentionGrabbing: number;
  feedback: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  return "#ef4444";
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5" />;
  if (rank === 2) return <Medal className="w-5 h-5" />;
  if (rank === 3) return <Award className="w-5 h-5" />;
  return <BarChart3 className="w-5 h-5" />;
}

function getRankColor(rank: number): string {
  if (rank === 1) return "#fbbf24";
  if (rank === 2) return "#94a3b8";
  if (rank === 3) return "#cd7f32";
  return "#64748b";
}

function CircularProgress({ score, size = 64, strokeWidth = 5 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" data-testid="circular-progress">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span
        className="absolute text-sm font-bold"
        style={{ color }}
        data-testid="text-score"
      >
        {score}
      </span>
    </div>
  );
}

function MiniProgressBar({ label, value }: { label: string; value: number }) {
  const color = getScoreColor(value);
  return (
    <div className="space-y-1" data-testid={`progress-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-white/60">{label}</span>
        <span className="text-xs font-medium" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function ThumbnailRanker() {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [rankings, setRankings] = useState<RankingResult[]>([]);
  const [isRanking, setIsRanking] = useState(false);

  const { data: mediaItems = [], isLoading } = useQuery<MediaItem[]>({
    queryKey: ["/api/media"],
  });

  const imageItems = useMemo(
    () => mediaItems.filter((item) => item.category === "image"),
    [mediaItems]
  );

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 6) {
        next.add(id);
      } else {
        toast({ title: "Maximum 6 images", description: "You can select up to 6 images for ranking.", variant: "destructive" });
      }
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (selectedIds.size < 2) {
      toast({ title: "Select more images", description: "Please select at least 2 images to rank.", variant: "destructive" });
      return;
    }

    setIsRanking(true);
    setRankings([]);

    try {
      const selectedMedia = imageItems.filter((item) => selectedIds.has(item.id));
      const imageUrls = selectedMedia.map((item) => `/objects/${item.url}`);

      const response = await fetch("/api/ai/thumbnail-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls, mediaIds: selectedMedia.map((m) => m.id) }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze thumbnails");
      }

      const data = await response.json();
      const sorted = (data.rankings as RankingResult[]).sort((a, b) => b.overallScore - a.overallScore);
      setRankings(sorted);
    } catch {
      toast({ title: "Analysis failed", description: "Could not rank thumbnails. Please try again.", variant: "destructive" });
    } finally {
      setIsRanking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.header
          className="flex items-center gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
              AI Thumbnail Ranker
            </h1>
          </div>
          <InfoBubble text="Select 2-6 images from your vault and let AI rank them by social media impact potential." side="bottom" />
        </motion.header>

        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h2 className="text-lg font-semibold" data-testid="text-step-1-title">Step 1: Select Images</h2>
            <Badge variant="secondary" data-testid="badge-selected-count">
              {selectedIds.size}/6 selected
            </Badge>
            <InfoBubble text="Click images to select them. Choose between 2 and 6 images for comparison ranking." side="right" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-white/40" />
            </div>
          ) : imageItems.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-8 text-center">
              <p className="text-white/50" data-testid="text-no-images">No images found in your vault. Upload some images first.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <AnimatePresence>
                {imageItems.map((item, index) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelection(item.id)}
                        className={`relative group rounded-md overflow-visible w-full aspect-square focus:outline-none transition-all duration-200 ${
                          isSelected
                            ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0a0a14]"
                            : "ring-1 ring-white/10 hover:ring-white/30"
                        }`}
                        data-testid={`button-select-image-${item.id}`}
                      >
                        <img
                          src={`/objects/${item.url}`}
                          alt={item.title || "Image"}
                          className="w-full h-full object-cover rounded-md"
                          loading="lazy"
                          data-testid={`img-media-${item.id}`}
                        />
                        <div
                          className={`absolute inset-0 rounded-md transition-colors duration-200 ${
                            isSelected ? "bg-amber-400/20" : "bg-transparent group-hover:bg-white/10"
                          }`}
                        />
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center"
                            data-testid={`icon-check-${item.id}`}
                          >
                            <Check className="w-4 h-4 text-black" />
                          </motion.div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent rounded-b-md">
                          <p className="text-xs text-white/80 truncate">{item.title || "Untitled"}</p>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.section>

        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h2 className="text-lg font-semibold" data-testid="text-step-2-title">Step 2: Rank</h2>
            <InfoBubble text="AI will analyze each image for composition, color impact, emotional appeal, and attention-grabbing potential." side="right" />
          </div>

          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                onClick={handleAnalyze}
                disabled={selectedIds.size < 2 || isRanking}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold hover:from-amber-400 hover:to-orange-400"
                data-testid="button-analyze-rank"
              >
                {isRanking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze & Rank
                  </>
                )}
              </Button>
              <span className="text-sm text-white/40" data-testid="text-selection-hint">
                {selectedIds.size < 2
                  ? `Select at least ${2 - selectedIds.size} more image${2 - selectedIds.size > 1 ? "s" : ""}`
                  : `${selectedIds.size} image${selectedIds.size > 1 ? "s" : ""} ready for analysis`}
              </span>
            </div>
          </Card>
        </motion.section>

        <AnimatePresence>
          {rankings.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <h2 className="text-lg font-semibold" data-testid="text-results-title">Results</h2>
                <InfoBubble text="Images are ranked from best to worst based on AI analysis of social media impact potential." side="right" />
              </div>

              <div className="space-y-4">
                {rankings.map((result, index) => {
                  const rank = index + 1;
                  const isWinner = rank === 1;
                  const rankColor = getRankColor(rank);

                  return (
                    <motion.div
                      key={result.mediaId}
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.15 }}
                      data-testid={`card-ranking-${rank}`}
                    >
                      <Card
                        className={`relative bg-white/[0.03] border-white/10 backdrop-blur-xl p-5 ${
                          isWinner ? "border-amber-400/40" : ""
                        }`}
                        style={
                          isWinner
                            ? { boxShadow: "0 0 40px rgba(251, 191, 36, 0.15), 0 0 80px rgba(251, 191, 36, 0.05)" }
                            : undefined
                        }
                      >
                        <div className={`flex gap-5 ${isWinner ? "flex-col sm:flex-row" : "flex-col sm:flex-row"}`}>
                          <div className="flex items-start gap-4 shrink-0">
                            <div
                              className="flex flex-col items-center gap-1 min-w-[48px]"
                              data-testid={`text-rank-${rank}`}
                            >
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: `${rankColor}20`, color: rankColor }}
                              >
                                {getRankIcon(rank)}
                              </div>
                              <span
                                className="text-xs font-bold"
                                style={{ color: rankColor }}
                              >
                                #{rank}
                              </span>
                            </div>

                            <div
                              className={`rounded-md overflow-hidden shrink-0 ${
                                isWinner ? "w-32 h-32 sm:w-40 sm:h-40" : "w-24 h-24 sm:w-32 sm:h-32"
                              }`}
                            >
                              <img
                                src={result.imageUrl}
                                alt={`Rank ${rank}`}
                                className="w-full h-full object-cover"
                                data-testid={`img-ranked-${rank}`}
                              />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-4">
                            <div className="flex items-center gap-4 flex-wrap">
                              <CircularProgress
                                score={result.overallScore}
                                size={isWinner ? 72 : 64}
                                strokeWidth={isWinner ? 6 : 5}
                              />
                              <div>
                                <p className="text-sm text-white/50">Overall Score</p>
                                <p
                                  className="text-xl font-bold"
                                  style={{ color: getScoreColor(result.overallScore) }}
                                  data-testid={`text-overall-score-${rank}`}
                                >
                                  {result.overallScore}/100
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <MiniProgressBar label="Composition" value={result.composition} />
                              <MiniProgressBar label="Color Impact" value={result.colorImpact} />
                              <MiniProgressBar label="Emotional Appeal" value={result.emotionalAppeal} />
                              <MiniProgressBar label="Attention-Grabbing" value={result.attentionGrabbing} />
                            </div>

                            <p
                              className="text-sm text-white/60 leading-relaxed"
                              data-testid={`text-feedback-${rank}`}
                            >
                              {result.feedback}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}