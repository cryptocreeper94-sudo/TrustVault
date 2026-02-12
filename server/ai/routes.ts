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
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
