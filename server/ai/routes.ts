import type { Express, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { storage } from "../storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

export function registerAIRoutes(app: Express): void {
  app.post("/api/ai/auto-tag", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { imageUrl, filename, category } = req.body;

      if (!imageUrl && !filename) {
        return res.status(400).json({ error: "imageUrl or filename is required" });
      }

      const hasVisualContent = imageUrl && (category === "image" || category === "video");

      let prompt: string;
      if (hasVisualContent) {
        prompt = `Analyze this image and provide:
1. A brief one-sentence description of what's in the image
2. 5-8 relevant tags for organizing this media

Respond in this exact JSON format:
{"description": "...", "tags": ["tag1", "tag2", ...]}`;
      } else {
        prompt = `Given a media file named "${filename}" of type "${category || "other"}", suggest:
1. A brief one-sentence description of what this file likely contains
2. 5-8 relevant tags for organizing this file

Respond in this exact JSON format:
{"description": "...", "tags": ["tag1", "tag2", ...]}`;
      }

      let response;

      if (hasVisualContent) {
        let fullUrl = imageUrl;
        if (imageUrl.startsWith("/")) {
          const host = `${req.protocol}://${req.get("host")}`;
          fullUrl = `${host}${imageUrl}`;
        }

        response = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: fullUrl, detail: "low" } },
              ],
            },
          ],
          max_completion_tokens: 300,
          response_format: { type: "json_object" },
        });
      } else {
        response = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [{ role: "user", content: prompt }],
          max_completion_tokens: 300,
          response_format: { type: "json_object" },
        });
      }

      const text = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);

      res.json({
        description: parsed.description || "",
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
      });
    } catch (error) {
      console.error("AI auto-tag error:", error);
      res.status(500).json({ error: "Failed to generate tags" });
    }
  });

  app.post("/api/ai/smart-search", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      const tenantId = req.session.tenantId!;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }

      const allItems = await storage.getMediaItems(tenantId);

      const mediaContext = allItems.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || "",
        tags: item.tags?.join(", ") || "",
        category: item.category,
        filename: item.filename,
        label: item.label || "",
        artist: item.artist || "",
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a media search assistant. Given a user's natural language search query and a list of media items, return the IDs of items that match the query. Consider titles, descriptions, tags, categories, filenames, labels, and artists. Be generous in matching - include items that are even loosely related. Return a JSON object with an "ids" key containing an array of matching item IDs, ordered by relevance (most relevant first). Example: {"ids": [1, 5, 12]}. If nothing matches, return {"ids": []}.`,
          },
          {
            role: "user",
            content: `Search query: "${query}"\n\nMedia items:\n${JSON.stringify(mediaContext)}`,
          },
        ],
        max_completion_tokens: 500,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);
      const matchedIds: number[] = Array.isArray(parsed.ids) ? parsed.ids : (Array.isArray(parsed) ? parsed : []);

      const results = matchedIds
        .map(id => allItems.find(item => item.id === id))
        .filter(Boolean);

      res.json({ results, matchedIds });
    } catch (error) {
      console.error("AI smart search error:", error);
      res.status(500).json({ error: "Failed to perform smart search" });
    }
  });

  app.post("/api/ai/enhance-suggest", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      let fullUrl = imageUrl;
      if (imageUrl.startsWith("/")) {
        const host = `${req.protocol}://${req.get("host")}`;
        fullUrl = `${host}${imageUrl}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and suggest optimal color grading adjustments. Return values as numbers between -100 and 100 (0 = no change) for each parameter. Consider the current exposure, color balance, and overall mood. Make corrections that would improve the image quality.

Return this exact JSON format:
{
  "brightness": <-100 to 100>,
  "contrast": <-100 to 100>,
  "saturation": <-100 to 100>,
  "hue": <-180 to 180>,
  "temperature": <-100 to 100>,
  "vignette": <0 to 100>,
  "sharpen": <0 to 100>,
  "explanation": "Brief explanation of why these adjustments improve the image"
}`,
              },
              { type: "image_url", image_url: { url: fullUrl, detail: "low" } },
            ],
          },
        ],
        max_completion_tokens: 400,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);

      res.json({
        brightness: clamp(parsed.brightness || 0, -100, 100),
        contrast: clamp(parsed.contrast || 0, -100, 100),
        saturation: clamp(parsed.saturation || 0, -100, 100),
        hue: clamp(parsed.hue || 0, -180, 180),
        temperature: clamp(parsed.temperature || 0, -100, 100),
        vignette: clamp(parsed.vignette || 0, 0, 100),
        sharpen: clamp(parsed.sharpen || 0, 0, 100),
        explanation: parsed.explanation || "AI-optimized settings applied",
      });
    } catch (error) {
      console.error("AI enhance error:", error);
      res.status(500).json({ error: "Failed to generate enhancement suggestions" });
    }
  });

  app.post("/api/ai/caption", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { imageUrl, title, category, style = "descriptive" } = req.body;

      if (!title && !imageUrl) {
        return res.status(400).json({ error: "title or imageUrl is required" });
      }

      const styleGuide: Record<string, string> = {
        descriptive: "Write a clear, descriptive caption (1-2 sentences) that describes the content.",
        social: "Write a catchy social media caption with a conversational tone. Keep it engaging and under 280 characters.",
        professional: "Write a professional, polished description suitable for a portfolio or business context.",
        creative: "Write a creative, artistic caption that evokes emotion and tells a story. Be poetic but concise.",
      };

      const captionStyle = styleGuide[style] || styleGuide.descriptive;

      let messages: OpenAI.Chat.ChatCompletionMessageParam[];

      if (imageUrl && (category === "image" || category === "video")) {
        let fullUrl = imageUrl;
        if (imageUrl.startsWith("/")) {
          const host = `${req.protocol}://${req.get("host")}`;
          fullUrl = `${host}${imageUrl}`;
        }

        messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${captionStyle}\n\nThe media is titled "${title || "Untitled"}".`,
              },
              { type: "image_url", image_url: { url: fullUrl, detail: "low" } },
            ],
          },
        ];
      } else {
        messages = [
          {
            role: "user",
            content: `${captionStyle}\n\nGenerate a caption for a ${category || "media"} file titled "${title || "Untitled"}".`,
          },
        ];
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        max_completion_tokens: 200,
      });

      const caption = response.choices[0]?.message?.content?.trim() || "";

      res.json({ caption });
    } catch (error) {
      console.error("AI caption error:", error);
      res.status(500).json({ error: "Failed to generate caption" });
    }
  });

  app.post("/api/ai/remove-background", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      let fullUrl = imageUrl;
      if (imageUrl.startsWith("/")) {
        const host = `${req.protocol}://${req.get("host")}`;
        fullUrl = `${host}${imageUrl}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and identify the main subject(s) that should be kept. Return the bounding box of the primary subject as normalized coordinates (0-1 range relative to image width and height).

Also identify the dominant background color by analyzing the background pixels.

Return this exact JSON format:
{
  "subject": {
    "x": <0-1 normalized left position>,
    "y": <0-1 normalized top position>,
    "width": <0-1 normalized width>,
    "height": <0-1 normalized height>
  },
  "backgroundColor": "<hex color code of dominant background>",
  "confidence": <0-100 confidence percentage>,
  "description": "Brief description of what is the main subject"
}`,
              },
              { type: "image_url", image_url: { url: fullUrl, detail: "high" } },
            ],
          },
        ],
        max_completion_tokens: 300,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);

      res.json({
        subject: parsed.subject || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
        backgroundColor: parsed.backgroundColor || "#ffffff",
        confidence: Math.min(100, Math.max(0, parsed.confidence || 75)),
        description: parsed.description || "Main subject identified",
      });
    } catch (error) {
      console.error("AI remove-background error:", error);
      res.status(500).json({ error: "Failed to analyze background" });
    }
  });

  app.post("/api/ai/smart-erase", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { imageUrl, region } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      if (!region || typeof region.x !== "number" || typeof region.y !== "number" || 
          typeof region.width !== "number" || typeof region.height !== "number") {
        return res.status(400).json({ error: "region with x, y, width, height (normalized 0-1) is required" });
      }

      let fullUrl = imageUrl;
      if (imageUrl.startsWith("/")) {
        const host = `${req.protocol}://${req.get("host")}`;
        fullUrl = `${host}${imageUrl}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and a specific region within it. The region to be filled is defined by normalized coordinates: x=${region.x.toFixed(2)}, y=${region.y.toFixed(2)}, width=${region.width.toFixed(2)}, height=${region.height.toFixed(2)} (where 0-1 represents left-right and top-bottom).

Analyze what's in that region and the surrounding context. Suggest the best way to fill this region to make it look natural. Consider the background, textures, and colors immediately surrounding the region.

Return this exact JSON format:
{
  "fillColor": "<hex color code that best matches the surrounding area>",
  "fillPattern": "<one of: solid, gradient, texture, blur, or auto>",
  "description": "Brief description of recommended fill approach and why"
}`,
              },
              { type: "image_url", image_url: { url: fullUrl, detail: "high" } },
            ],
          },
        ],
        max_completion_tokens: 300,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);

      res.json({
        fillColor: parsed.fillColor || "#ffffff",
        fillPattern: parsed.fillPattern || "solid",
        description: parsed.description || "Fill suggestion generated",
      });
    } catch (error) {
      console.error("AI smart-erase error:", error);
      res.status(500).json({ error: "Failed to generate fill suggestion" });
    }
  });

  app.post("/api/ai/voice-command", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { command } = req.body;

      if (!command || typeof command !== "string") {
        return res.status(400).json({ error: "command is required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a photo editing voice command parser. Parse the user's natural language command into structured editor actions. Return a JSON object with "actions" (array) and "explanation" (string).

Each action has a "type" and "params" object. Supported action types and their params:
- "brightness": { "value": number } (slider value, -100 to 100)
- "contrast": { "value": number } (slider value, -100 to 100)
- "saturation": { "value": number } (slider value, -100 to 100)
- "blur": { "value": number } (slider value, 0 to 100)
- "hue": { "value": number } (slider value, -180 to 180)
- "temperature": { "value": number } (slider value, -100 to 100)
- "vignette": { "value": number } (slider value, 0 to 100)
- "sharpen": { "value": number } (slider value, 0 to 100)
- "rotate_left": {} (no params needed)
- "rotate_right": {} (no params needed)
- "flip_horizontal": {} (no params needed)
- "flip_vertical": {} (no params needed)
- "crop": { "aspect": string } (e.g. "16:9", "4:3", "1:1", "free")
- "filter": { "preset": string } (e.g. "vintage", "noir", "warm", "cool", "dramatic", "fade")
- "reset": {} (reset all adjustments)

Values for sliders should be absolute values (not relative). If the user says "make it brighter", use a positive brightness value like 30. If they say "make it very bright", use a higher value like 70. Interpret the intensity from the user's language.

Return format: { "actions": [{ "type": "...", "params": {...} }], "explanation": "..." }`,
          },
          {
            role: "user",
            content: command,
          },
        ],
        max_completion_tokens: 500,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);

      res.json({
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        explanation: parsed.explanation || "Command processed",
      });
    } catch (error) {
      console.error("AI voice-command error:", error);
      res.status(500).json({ error: "Failed to parse voice command" });
    }
  });

  app.post("/api/ai/thumbnail-rank", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { imageUrls } = req.body;

      if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: "imageUrls array is required" });
      }

      if (imageUrls.length > 6) {
        return res.status(400).json({ error: "Maximum 6 images allowed" });
      }

      const host = `${req.protocol}://${req.get("host")}`;
      const fullUrls = imageUrls.map((url: string) =>
        url.startsWith("/") ? `${host}${url}` : url
      );

      const imageContent: OpenAI.Chat.ChatCompletionContentPart[] = [
        {
          type: "text",
          text: `Analyze the following ${fullUrls.length} images and rank them for social media thumbnail impact. For each image, score it on four criteria (each 0-25, total max 100):
- composition: How well-composed is the image? (framing, rule of thirds, balance)
- colorImpact: How visually striking are the colors? (vibrancy, contrast, appeal)
- emotionalAppeal: How emotionally engaging is the image? (storytelling, mood, connection)
- attentionGrabbing: How likely is it to stop someone scrolling? (uniqueness, clarity, intrigue)

Return a JSON object with a "rankings" array. Each entry has: "index" (0-based image index), "totalScore" (sum of all scores), "scores" (object with composition, colorImpact, emotionalAppeal, attentionGrabbing), and "feedback" (brief suggestion to improve).

Sort the rankings array by totalScore descending.

Format: { "rankings": [{ "index": 0, "totalScore": 85, "scores": { "composition": 22, "colorImpact": 20, "emotionalAppeal": 23, "attentionGrabbing": 20 }, "feedback": "..." }] }`,
        },
        ...fullUrls.map((url: string) => ({
          type: "image_url" as const,
          image_url: { url, detail: "low" as const },
        })),
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: imageContent,
          },
        ],
        max_completion_tokens: 1000,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);

      const rankings = Array.isArray(parsed.rankings)
        ? parsed.rankings
            .map((r: any) => ({
              url: imageUrls[r.index] || imageUrls[0],
              totalScore: clamp(r.totalScore || 0, 0, 100),
              scores: {
                composition: clamp(r.scores?.composition || 0, 0, 25),
                colorImpact: clamp(r.scores?.colorImpact || 0, 0, 25),
                emotionalAppeal: clamp(r.scores?.emotionalAppeal || 0, 0, 25),
                attentionGrabbing: clamp(r.scores?.attentionGrabbing || 0, 0, 25),
              },
              feedback: r.feedback || "",
            }))
            .sort((a: any, b: any) => b.totalScore - a.totalScore)
        : [];

      res.json({ rankings });
    } catch (error) {
      console.error("AI thumbnail-rank error:", error);
      res.status(500).json({ error: "Failed to rank thumbnails" });
    }
  });

  app.post("/api/ai/style-analyze", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      let fullUrl = imageUrl;
      if (imageUrl.startsWith("/")) {
        const host = `${req.protocol}://${req.get("host")}`;
        fullUrl = `${host}${imageUrl}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze the aesthetic style of this image. Evaluate its visual characteristics and return a detailed style analysis.

Return this exact JSON format:
{
  "style": {
    "warmth": <-100 to 100, negative=cool, positive=warm>,
    "contrast": "<low|medium|high>",
    "saturation": "<muted|natural|vivid>",
    "mood": "<single word or short phrase describing the mood>",
    "colorPalette": ["<hex1>", "<hex2>", "<hex3>", "<hex4>", "<hex5>"],
    "dominantTone": "<description of the dominant color tone>",
    "editingStyle": "<description of the editing/photography style>"
  },
  "description": "<2-3 sentence description of the overall aesthetic>"
}`,
              },
              { type: "image_url", image_url: { url: fullUrl, detail: "low" } },
            ],
          },
        ],
        max_completion_tokens: 500,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);

      res.json({
        style: {
          warmth: clamp(parsed.style?.warmth || 0, -100, 100),
          contrast: parsed.style?.contrast || "medium",
          saturation: parsed.style?.saturation || "natural",
          mood: parsed.style?.mood || "neutral",
          colorPalette: Array.isArray(parsed.style?.colorPalette) ? parsed.style.colorPalette.slice(0, 5) : [],
          dominantTone: parsed.style?.dominantTone || "neutral",
          editingStyle: parsed.style?.editingStyle || "standard",
        },
        description: parsed.description || "Style analysis complete",
      });
    } catch (error) {
      console.error("AI style-analyze error:", error);
      res.status(500).json({ error: "Failed to analyze style" });
    }
  });

  app.post("/api/ai/social-kit-suggest", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { imageUrl, platform } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      const validPlatforms = ["instagram_post", "instagram_story", "twitter", "linkedin", "youtube_thumbnail"];
      if (!platform || !validPlatforms.includes(platform)) {
        return res.status(400).json({ error: `platform must be one of: ${validPlatforms.join(", ")}` });
      }

      let fullUrl = imageUrl;
      if (imageUrl.startsWith("/")) {
        const host = `${req.protocol}://${req.get("host")}`;
        fullUrl = `${host}${imageUrl}`;
      }

      const platformSpecs: Record<string, string> = {
        instagram_post: "Instagram post (1080x1080, 1:1 square). Focus on visual impact and clean composition.",
        instagram_story: "Instagram story (1080x1920, 9:16 vertical). Ensure main subject is centered with room for text overlays.",
        twitter: "Twitter/X post (1200x675, 16:9 landscape). Optimize for timeline visibility and quick engagement.",
        linkedin: "LinkedIn post (1200x627, ~1.91:1 landscape). Professional appearance with clear focal point.",
        youtube_thumbnail: "YouTube thumbnail (1280x720, 16:9 landscape). Maximum visual impact, bold and eye-catching.",
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and suggest optimal crop coordinates and color adjustments for ${platformSpecs[platform]}.

Provide crop coordinates as normalized values (0-1 range) relative to the original image dimensions. The crop should focus on the most impactful area of the image for this platform.

Also suggest color adjustments to optimize the image for this platform's typical viewing conditions.

Return this exact JSON format:
{
  "crop": {
    "x": <0-1 normalized left position>,
    "y": <0-1 normalized top position>,
    "width": <0-1 normalized width>,
    "height": <0-1 normalized height>
  },
  "adjustments": {
    "brightness": <-100 to 100>,
    "contrast": <-100 to 100>,
    "saturation": <-100 to 100>
  },
  "suggestion": "<Brief explanation of why these settings work best for this platform>"
}`,
              },
              { type: "image_url", image_url: { url: fullUrl, detail: "low" } },
            ],
          },
        ],
        max_completion_tokens: 400,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);

      res.json({
        crop: {
          x: clamp(parsed.crop?.x || 0, 0, 1),
          y: clamp(parsed.crop?.y || 0, 0, 1),
          width: clamp(parsed.crop?.width || 1, 0, 1),
          height: clamp(parsed.crop?.height || 1, 0, 1),
        },
        adjustments: {
          brightness: clamp(parsed.adjustments?.brightness || 0, -100, 100),
          contrast: clamp(parsed.adjustments?.contrast || 0, -100, 100),
          saturation: clamp(parsed.adjustments?.saturation || 0, -100, 100),
        },
        suggestion: parsed.suggestion || "Optimized for " + platform,
      });
    } catch (error) {
      console.error("AI social-kit-suggest error:", error);
      res.status(500).json({ error: "Failed to generate social kit suggestions" });
    }
  });
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
