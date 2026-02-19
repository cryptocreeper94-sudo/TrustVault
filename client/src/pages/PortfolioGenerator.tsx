import { useState, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Loader2, Copy, Download, RefreshCw, LayoutGrid, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { InfoBubble } from "@/components/InfoBubble";
import type { MediaItem } from "@shared/schema";

type PortfolioStyle = "minimal" | "magazine" | "gallery" | "mosaic";

interface ScoredImage {
  media: MediaItem;
  score: number;
}

const STYLE_OPTIONS: { value: PortfolioStyle; label: string; description: string }[] = [
  { value: "minimal", label: "Minimal", description: "Clean white grid, thin borders" },
  { value: "magazine", label: "Magazine", description: "Asymmetric bento grid, editorial feel" },
  { value: "gallery", label: "Gallery", description: "Large images, dark background, centered" },
  { value: "mosaic", label: "Mosaic", description: "Tightly packed varied sizes" },
];

export default function PortfolioGenerator() {
  const { toast } = useToast();
  const portfolioRef = useRef<HTMLDivElement>(null);

  const [portfolioStyle, setPortfolioStyle] = useState<PortfolioStyle>("minimal");
  const [title, setTitle] = useState("My Portfolio");
  const [tagline, setTagline] = useState("");
  const [maxImages, setMaxImages] = useState(8);
  const [selectedImages, setSelectedImages] = useState<ScoredImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [portfolioReady, setPortfolioReady] = useState(false);

  const { data: mediaItems = [], isLoading } = useQuery<MediaItem[]>({
    queryKey: ["/api/media"],
  });

  const imageItems = useMemo(
    () => mediaItems.filter((item) => item.category === "image"),
    [mediaItems]
  );

  const batchArray = useCallback(<T,>(arr: T[], size: number): T[][] => {
    const batches: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      batches.push(arr.slice(i, i + size));
    }
    return batches;
  }, []);

  const handleGenerate = useCallback(async () => {
    if (imageItems.length === 0) {
      toast({ title: "No images", description: "Upload images to your vault first.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setPortfolioReady(false);
    setSelectedImages([]);

    try {
      const allScored: ScoredImage[] = [];
      const batches = batchArray(imageItems, 6);

      for (const batch of batches) {
        const imageUrls = batch.map((item) => `/objects/${item.url}`);
        const mediaIds = batch.map((m) => m.id);

        try {
          const response = await fetch("/api/ai/thumbnail-rank", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrls, mediaIds }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.rankings) {
              for (const ranking of data.rankings) {
                const media = batch.find((b) => b.id === ranking.mediaId);
                if (media) {
                  allScored.push({ media, score: ranking.overallScore || 0 });
                }
              }
            }
          }
        } catch {
          for (const item of batch) {
            allScored.push({ media: item, score: Math.random() * 100 });
          }
        }
      }

      allScored.sort((a, b) => b.score - a.score);
      const topN = allScored.slice(0, maxImages);
      setSelectedImages(topN);
      setPortfolioReady(true);
      toast({ title: "Portfolio generated", description: `Selected ${topN.length} best images.` });
    } catch {
      toast({ title: "Generation failed", description: "Could not generate portfolio. Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [imageItems, maxImages, batchArray, toast]);

  const handleCopyLink = useCallback(() => {
    const ids = selectedImages.map((s) => s.media.id);
    const encoded = btoa(JSON.stringify({ ids, style: portfolioStyle, title, tagline }));
    const url = `${window.location.origin}/portfolio?data=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied", description: "Shareable portfolio link copied to clipboard." });
    }).catch(() => {
      toast({ title: "Copy failed", description: "Could not copy link.", variant: "destructive" });
    });
  }, [selectedImages, portfolioStyle, title, tagline, toast]);

  const handleDownload = useCallback(() => {
    const portfolioEl = portfolioRef.current;
    if (!portfolioEl) return;
    const win = window.open("", "_blank");
    if (!win) return;

    const images = selectedImages.map((s) => ({
      url: `/objects/${s.media.url}`,
      title: s.media.title || "",
    }));

    const gridStyle = portfolioStyle === "minimal"
      ? "display:grid;grid-template-columns:repeat(3,1fr);gap:16px;"
      : portfolioStyle === "magazine"
      ? "display:grid;grid-template-columns:repeat(4,1fr);gap:12px;"
      : portfolioStyle === "gallery"
      ? "display:flex;flex-direction:column;gap:32px;align-items:center;"
      : "column-count:3;column-gap:12px;";

    const itemStyle = portfolioStyle === "gallery"
      ? "width:100%;max-width:900px;"
      : "";

    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:${portfolioStyle === "gallery" ? "#0a0a14" : portfolioStyle === "minimal" ? "#ffffff" : "#111118"};
        color:${portfolioStyle === "minimal" ? "#111" : "#fff"};
        font-family:system-ui,-apple-system,sans-serif;padding:48px 24px}
      h1{text-align:center;font-size:36px;font-weight:700;margin-bottom:8px}
      p.tagline{text-align:center;font-size:16px;opacity:0.6;margin-bottom:48px}
      .grid{${gridStyle}max-width:1100px;margin:0 auto}
      .item{${itemStyle}overflow:hidden;border-radius:8px}
      .item img{width:100%;display:block;object-fit:cover}
      ${portfolioStyle === "magazine" ? ".item:nth-child(3n+1){grid-column:span 2}" : ""}
      ${portfolioStyle === "mosaic" ? ".item{break-inside:avoid;margin-bottom:12px}" : ""}
    </style></head><body>
      <h1>${title}</h1>
      ${tagline ? `<p class="tagline">${tagline}</p>` : ""}
      <div class="grid">${images.map((img) => `<div class="item"><img src="${img.url}" alt="${img.title}"/></div>`).join("")}</div>
    </body></html>`);
    win.document.close();
  }, [selectedImages, portfolioStyle, title, tagline]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

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
            <Sparkles className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
              Portfolio Generator
            </h1>
          </div>
          <InfoBubble text="AI selects your best images and arranges them into a stunning, shareable portfolio page." side="bottom" />
        </motion.header>

        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <LayoutGrid className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold" data-testid="text-config-title">Configuration</h2>
              <InfoBubble text="Choose a style and customize your portfolio before generating." side="right" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-white/50">Portfolio Style</label>
                    <InfoBubble text="Choose how your images are laid out in the portfolio." side="right" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLE_OPTIONS.map((style) => (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => setPortfolioStyle(style.value)}
                        className={`relative rounded-md p-3 text-left transition-all duration-200 ${
                          portfolioStyle === style.value
                            ? "bg-purple-500/20 ring-2 ring-purple-400 ring-offset-1 ring-offset-[#0a0a14]"
                            : "bg-white/5 ring-1 ring-white/10 hover:ring-white/20"
                        }`}
                        data-testid={`button-style-${style.value}`}
                      >
                        <span className="text-sm font-medium block">{style.label}</span>
                        <span className="text-xs text-white/40 block mt-0.5">{style.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-white/50" htmlFor="portfolio-title">Title</label>
                    <InfoBubble text="The main heading displayed on your portfolio." side="right" />
                  </div>
                  <Input
                    id="portfolio-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Portfolio"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    data-testid="input-title"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-white/50" htmlFor="portfolio-tagline">Tagline</label>
                    <InfoBubble text="An optional subtitle displayed below the title." side="right" />
                  </div>
                  <Input
                    id="portfolio-tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="A curated collection of my best work"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    data-testid="input-tagline"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-white/50">Max Images</label>
                    <InfoBubble text="How many top-scoring images to include in the portfolio (4-20)." side="right" />
                    <Badge variant="secondary" className="ml-auto" data-testid="badge-max-images">{maxImages}</Badge>
                  </div>
                  <Slider
                    value={[maxImages]}
                    onValueChange={(v) => setMaxImages(v[0])}
                    min={4}
                    max={20}
                    step={1}
                    className="mt-3"
                    data-testid="slider-max-images"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-white/30">4</span>
                    <span className="text-xs text-white/30">20</span>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <ImageIcon className="w-4 h-4 text-white/40" />
                    <span className="text-xs text-white/40">
                      {isLoading ? "Loading vault..." : `${imageItems.length} images in vault`}
                    </span>
                    <InfoBubble text="The total number of images available in your vault for AI selection." side="right" />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || isLoading || imageItems.length === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-violet-500 text-white font-semibold"
                    data-testid="button-generate"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        AI is selecting your best work...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Portfolio
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        <AnimatePresence>
          {isGenerating && !portfolioReady && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8"
            >
              <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl p-12 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="inline-block mb-4"
                >
                  <Sparkles className="w-10 h-10 text-purple-400" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2" data-testid="text-generating-title">AI is selecting your best work...</h3>
                <p className="text-sm text-white/50" data-testid="text-generating-subtitle">
                  Analyzing {imageItems.length} images for composition, color impact, and visual appeal
                </p>
                <div className="mt-6 flex items-center justify-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-purple-400"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {portfolioReady && selectedImages.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h2 className="text-lg font-semibold" data-testid="text-preview-title">Portfolio Preview</h2>
                <Badge variant="secondary" data-testid="badge-image-count">{selectedImages.length} images</Badge>
                <InfoBubble text="Preview how your portfolio will look. Use the action buttons below to share or download." side="right" />
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={handleCopyLink} data-testid="button-copy-link" className="border-white/10 text-white/70">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download" className="border-white/10 text-white/70">
                    <Download className="w-4 h-4 mr-2" />
                    Download as Page
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isGenerating} data-testid="button-regenerate" className="border-white/10 text-white/70">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>

              <div
                ref={portfolioRef}
                className={`rounded-md overflow-visible ${
                  portfolioStyle === "minimal"
                    ? "bg-white p-8"
                    : portfolioStyle === "gallery"
                    ? "bg-[#0a0a14] p-8"
                    : "bg-[#111118] p-6"
                }`}
                data-testid="portfolio-preview"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className="mb-8 text-center"
                >
                  <h2
                    className={`text-3xl md:text-4xl font-bold tracking-tight mb-2 ${
                      portfolioStyle === "minimal" ? "text-gray-900" : "text-white"
                    }`}
                    data-testid="text-portfolio-title"
                  >
                    {title}
                  </h2>
                  {tagline && (
                    <p
                      className={`text-base ${
                        portfolioStyle === "minimal" ? "text-gray-500" : "text-white/50"
                      }`}
                      data-testid="text-portfolio-tagline"
                    >
                      {tagline}
                    </p>
                  )}
                  <div
                    className={`w-16 h-0.5 mx-auto mt-4 ${
                      portfolioStyle === "minimal" ? "bg-gray-200" : "bg-white/10"
                    }`}
                  />
                </motion.div>

                {portfolioStyle === "minimal" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedImages.map((item, index) => (
                      <motion.div
                        key={item.media.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.06 }}
                        className="group relative aspect-square overflow-visible rounded-md border border-gray-100"
                        data-testid={`portfolio-image-${item.media.id}`}
                      >
                        <img
                          src={`/objects/${item.media.url}`}
                          alt={item.media.title || "Portfolio image"}
                          className="w-full h-full object-cover rounded-md transition-transform duration-500 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}

                {portfolioStyle === "magazine" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedImages.map((item, index) => {
                      const isFeature = index % 3 === 0;
                      return (
                        <motion.div
                          key={item.media.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.06 }}
                          className={`group relative overflow-visible rounded-md ${
                            isFeature ? "col-span-2 row-span-2" : ""
                          }`}
                          style={{ aspectRatio: isFeature ? "1" : "4/5" }}
                          data-testid={`portfolio-image-${item.media.id}`}
                        >
                          <img
                            src={`/objects/${item.media.url}`}
                            alt={item.media.title || "Portfolio image"}
                            className="w-full h-full object-cover rounded-md transition-transform duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <p className="text-xs text-white/80 font-medium truncate">{item.media.title || ""}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {portfolioStyle === "gallery" && (
                  <div className="flex flex-col items-center gap-8 max-w-3xl mx-auto">
                    {selectedImages.map((item, index) => (
                      <motion.div
                        key={item.media.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.08 }}
                        className="group relative w-full overflow-visible rounded-md"
                        data-testid={`portfolio-image-${item.media.id}`}
                      >
                        <img
                          src={`/objects/${item.media.url}`}
                          alt={item.media.title || "Portfolio image"}
                          className="w-full rounded-md transition-transform duration-500 group-hover:scale-[1.01]"
                          loading="lazy"
                        />
                        {item.media.title && (
                          <p className="text-center text-sm text-white/40 mt-3 italic">
                            {item.media.title}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                {portfolioStyle === "mosaic" && (
                  <div className="columns-2 md:columns-3 gap-3 space-y-3">
                    {selectedImages.map((item, index) => (
                      <motion.div
                        key={item.media.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className="group relative overflow-visible rounded-md break-inside-avoid"
                        data-testid={`portfolio-image-${item.media.id}`}
                      >
                        <img
                          src={`/objects/${item.media.url}`}
                          alt={item.media.title || "Portfolio image"}
                          className="w-full rounded-md transition-transform duration-500 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
