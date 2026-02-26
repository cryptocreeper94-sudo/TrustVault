import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Download, Loader2, ImageIcon, Check, Sparkles, Palette, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { InfoBubble } from "@/components/InfoBubble";
import { SiInstagram, SiLinkedin, SiYoutube } from "react-icons/si";
import type { MediaItem } from "@shared/schema";

interface PlatformSpec {
  id: string;
  name: string;
  width: number;
  height: number;
  ratio: string;
  icon: React.ReactNode;
  info: string;
}

const PLATFORMS: PlatformSpec[] = [
  {
    id: "instagram-post",
    name: "Instagram Post",
    width: 1080,
    height: 1080,
    ratio: "1:1",
    icon: <SiInstagram className="w-5 h-5" />,
    info: "Square format ideal for feed posts. Maximum engagement on Instagram's main grid.",
  },
  {
    id: "instagram-story",
    name: "Instagram Story",
    width: 1080,
    height: 1920,
    ratio: "9:16",
    icon: <SiInstagram className="w-5 h-5" />,
    info: "Full-screen vertical format for Stories and Reels. Captures attention in the stories tray.",
  },
  {
    id: "twitter-post",
    name: "Twitter/X Post",
    width: 1200,
    height: 675,
    ratio: "16:9",
    icon: <span className="font-bold text-base leading-none">X</span>,
    info: "Landscape format optimized for the Twitter/X timeline. Displays without cropping in feeds.",
  },
  {
    id: "linkedin-post",
    name: "LinkedIn Post",
    width: 1200,
    height: 627,
    ratio: "~1.91:1",
    icon: <SiLinkedin className="w-5 h-5" />,
    info: "Professional landscape format for LinkedIn feed posts. Ideal for business and thought leadership content.",
  },
  {
    id: "youtube-thumbnail",
    name: "YouTube Thumbnail",
    width: 1280,
    height: 720,
    ratio: "16:9",
    icon: <SiYoutube className="w-5 h-5" />,
    info: "Standard HD thumbnail size for YouTube videos. High resolution ensures crisp display on all devices.",
  },
];

interface GradientPreset {
  id: string;
  name: string;
  css: string;
  stops: Array<{ offset: number; color: string }>;
}

const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "dark-to-light", name: "Dark to Light", css: "linear-gradient(135deg, #1a1a2e, #3a3a5c, #7a7aaa)", stops: [{ offset: 0, color: "#1a1a2e" }, { offset: 0.5, color: "#3a3a5c" }, { offset: 1, color: "#7a7aaa" }] },
  { id: "sunset", name: "Sunset", css: "linear-gradient(135deg, #f12711, #f5af19)", stops: [{ offset: 0, color: "#f12711" }, { offset: 1, color: "#f5af19" }] },
  { id: "ocean", name: "Ocean", css: "linear-gradient(135deg, #2193b0, #6dd5ed)", stops: [{ offset: 0, color: "#2193b0" }, { offset: 1, color: "#6dd5ed" }] },
  { id: "forest", name: "Forest", css: "linear-gradient(135deg, #134e5e, #71b280)", stops: [{ offset: 0, color: "#134e5e" }, { offset: 1, color: "#71b280" }] },
  { id: "neon", name: "Neon", css: "linear-gradient(135deg, #b721ff, #21d4fd)", stops: [{ offset: 0, color: "#b721ff" }, { offset: 1, color: "#21d4fd" }] },
  { id: "midnight", name: "Midnight", css: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", stops: [{ offset: 0, color: "#0f0c29" }, { offset: 0.5, color: "#302b63" }, { offset: 1, color: "#24243e" }] },
  { id: "rose", name: "Rose", css: "linear-gradient(135deg, #ee9ca7, #ffdde1)", stops: [{ offset: 0, color: "#ee9ca7" }, { offset: 1, color: "#ffdde1" }] },
  { id: "monochrome", name: "Monochrome", css: "linear-gradient(135deg, #232526, #414345)", stops: [{ offset: 0, color: "#232526" }, { offset: 1, color: "#414345" }] },
];

type FitMode = "crop" | "letterbox";

function centerCropToCanvas(
  img: HTMLImageElement,
  targetW: number,
  targetH: number
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d")!;

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const targetAspect = targetW / targetH;
    const imgAspect = imgW / imgH;

    let sx = 0;
    let sy = 0;
    let sw = imgW;
    let sh = imgH;

    if (imgAspect > targetAspect) {
      sw = imgH * targetAspect;
      sx = (imgW - sw) / 2;
    } else {
      sh = imgW / targetAspect;
      sy = (imgH - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob));
      }
    }, "image/png");
  });
}

function letterboxToCanvas(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  gradient: GradientPreset
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d")!;

    const grad = ctx.createLinearGradient(0, 0, targetW, targetH);
    for (const stop of gradient.stops) {
      grad.addColorStop(stop.offset, stop.color);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, targetW, targetH);

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const targetAspect = targetW / targetH;
    const imgAspect = imgW / imgH;

    let drawW: number;
    let drawH: number;

    if (imgAspect > targetAspect) {
      drawW = targetW;
      drawH = targetW / imgAspect;
    } else {
      drawH = targetH;
      drawW = targetH * imgAspect;
    }

    const offsetX = (targetW - drawW) / 2;
    const offsetY = (targetH - drawH) / 2;

    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob));
      }
    }, "image/png");
  });
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
};

export default function SocialMediaKit() {
  const { toast } = useToast();
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [fitMode, setFitMode] = useState<FitMode>("crop");
  const [selectedGradientId, setSelectedGradientId] = useState<string>("midnight");

  const { data: mediaItems, isLoading } = useQuery<MediaItem[]>({
    queryKey: ["/api/media"],
  });

  const imageItems = mediaItems?.filter((m) => m.category === "image") ?? [];
  const selectedItem = imageItems.find((m) => m.id === selectedMediaId);

  const handleSelectImage = useCallback((id: number) => {
    setSelectedMediaId(id);
    setGeneratedImages({});
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedItem) return;

    setIsGenerating(true);
    setGeneratedImages({});

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = `/objects/${selectedItem.url}`;
      });
      imgRef.current = img;

      const results: Record<string, string> = {};
      for (const platform of PLATFORMS) {
        let blobUrl: string;
        if (fitMode === "letterbox") {
          const gradientPreset = GRADIENT_PRESETS.find(g => g.id === selectedGradientId) || GRADIENT_PRESETS[5];
          blobUrl = await letterboxToCanvas(img, platform.width, platform.height, gradientPreset);
        } else {
          blobUrl = await centerCropToCanvas(img, platform.width, platform.height);
        }
        results[platform.id] = blobUrl;
      }

      setGeneratedImages(results);
      toast({ title: "Social Media Kit Generated", description: `${PLATFORMS.length} sizes created successfully.` });
    } catch {
      toast({ title: "Generation Failed", description: "Could not process the image. Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedItem, toast, fitMode, selectedGradientId]);

  const handleDownload = useCallback((platformId: string, platformName: string) => {
    const url = generatedImages[platformId];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedItem?.title ?? "image"}-${platformId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [generatedImages, selectedItem]);

  const handleDownloadAll = useCallback(() => {
    for (const platform of PLATFORMS) {
      if (generatedImages[platform.id]) {
        handleDownload(platform.id, platform.name);
      }
    }
  }, [generatedImages, handleDownload]);

  const hasGenerated = Object.keys(generatedImages).length > 0;

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-6xl mx-auto px-4 py-6 space-y-8"
      >
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 flex-wrap"
          data-testid="header-social-media-kit"
        >
          <Link href="/" data-testid="link-back-home">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Social Media Kit</h1>
            <InfoBubble
              text="Generate perfectly-sized images for every social media platform from a single photo. One upload, every platform covered."
              side="bottom"
            />
          </div>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" data-testid="badge-step-1">Step 1</Badge>
            <h2 className="text-lg font-semibold" data-testid="text-step-1-title">Select Image</h2>
            <InfoBubble text="Choose an image from your vault to generate social media sizes." side="right" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16" data-testid="loading-media">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : imageItems.length === 0 ? (
            <Card className="glass-morphism p-8 flex flex-col items-center gap-3" data-testid="empty-media">
              <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm">No images found in your vault. Upload some images first.</p>
            </Card>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
              data-testid="grid-image-select"
            >
              {imageItems.map((item) => (
                <motion.div key={item.id} variants={itemVariants}>
                  <button
                    type="button"
                    onClick={() => handleSelectImage(item.id)}
                    className={`relative w-full aspect-square rounded-md overflow-hidden border-2 transition-all duration-200 focus:outline-none ${
                      selectedMediaId === item.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    data-testid={`button-select-image-${item.id}`}
                  >
                    <img
                      src={item.thumbnailUrl ? `/objects/${item.thumbnailUrl}` : `/objects/${item.url}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <AnimatePresence>
                      {selectedMediaId === item.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0 }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.section>

        <AnimatePresence>
          {selectedMediaId !== null && (
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" data-testid="badge-step-fit">Fit Mode</Badge>
                <h2 className="text-lg font-semibold" data-testid="text-fit-title">Resize Method</h2>
                <InfoBubble text="Choose how your image fits each platform. Crop fills the frame but may cut edges. Letterbox preserves the full image with a gradient background." side="right" />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant={fitMode === "crop" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFitMode("crop")}
                  data-testid="button-fit-crop"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Center Crop
                </Button>
                <Button
                  variant={fitMode === "letterbox" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFitMode("letterbox")}
                  data-testid="button-fit-letterbox"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Letterbox with Gradient
                </Button>
              </div>

              <AnimatePresence>
                {fitMode === "letterbox" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-xs text-muted-foreground mb-2">Choose gradient background</p>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {GRADIENT_PRESETS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedGradientId(g.id)}
                          className={`aspect-square rounded-md border-2 transition-all ${
                            selectedGradientId === g.id
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-transparent"
                          }`}
                          style={{ background: g.css }}
                          title={g.name}
                          data-testid={`button-smk-gradient-${g.id}`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      Selected: {GRADIENT_PRESETS.find(g => g.id === selectedGradientId)?.name}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                <Badge variant="outline" data-testid="badge-step-2">Step 2</Badge>
                <h2 className="text-lg font-semibold" data-testid="text-step-2-title">Generate Kit</h2>
                <InfoBubble text="Each platform has specific dimension requirements. We auto-crop and resize your image to fit perfectly." side="right" />
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                data-testid="grid-platforms"
              >
                {PLATFORMS.map((platform) => (
                  <motion.div key={platform.id} variants={itemVariants}>
                    <Card
                      className="glass-morphism p-4 space-y-3"
                      data-testid={`card-platform-${platform.id}`}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted/30 text-foreground">
                          {platform.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm truncate">{platform.name}</p>
                            <InfoBubble text={platform.info} side="top" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {platform.width} x {platform.height} ({platform.ratio})
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-ratio-${platform.id}`}>
                          {platform.ratio}
                        </Badge>
                      </div>

                      <AnimatePresence>
                        {generatedImages[platform.id] && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="space-y-2"
                          >
                            <div className="relative rounded-md overflow-hidden border border-border/50">
                              <img
                                src={generatedImages[platform.id]}
                                alt={`${platform.name} preview`}
                                className="w-full h-auto"
                                data-testid={`img-preview-${platform.id}`}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleDownload(platform.id, platform.name)}
                              data-testid={`button-download-${platform.id}`}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 flex-wrap"
              >
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  data-testid="button-generate-all"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate All Sizes
                    </>
                  )}
                </Button>

                {hasGenerated && (
                  <Button
                    variant="outline"
                    onClick={handleDownloadAll}
                    data-testid="button-download-all"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </Button>
                )}
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}