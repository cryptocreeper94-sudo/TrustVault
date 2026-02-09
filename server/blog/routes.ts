import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import OpenAI from "openai";

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function registerBlogRoutes(app: Express): void {

  app.get("/api/blog/posts", async (req: Request, res: Response) => {
    try {
      const status = (typeof req.query.status === "string" ? req.query.status : undefined);
      const posts = await storage.getBlogPosts(status || "published");
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/blog/posts/all", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching all blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/blog/posts/by-slug/:slug", async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.status !== "published") {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  app.get("/api/blog/posts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPost(Number(req.params.id));
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  app.post("/api/blog/posts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        excerpt: z.string().optional(),
        metaDescription: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        category: z.string().optional(),
        coverImageUrl: z.string().optional(),
        status: z.enum(["draft", "published", "archived"]).default("draft"),
      });
      const input = schema.parse(req.body);
      const slug = slugify(input.title) + "-" + Date.now().toString(36);
      const post = await storage.createBlogPost({
        ...input,
        slug,
        publishedAt: input.status === "published" ? new Date() : null,
      });
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating blog post:", error);
      res.status(500).json({ message: "Failed to create blog post" });
    }
  });

  app.patch("/api/blog/posts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getBlogPost(Number(req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Post not found" });
      }
      const updates: any = { ...req.body };
      if (updates.status === "published" && existing.status !== "published") {
        updates.publishedAt = new Date();
      }
      if (updates.title && updates.title !== existing.title) {
        updates.slug = slugify(updates.title) + "-" + Date.now().toString(36);
      }
      const post = await storage.updateBlogPost(Number(req.params.id), updates);
      res.json(post);
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ message: "Failed to update blog post" });
    }
  });

  app.delete("/api/blog/posts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteBlogPost(Number(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  app.post("/api/blog/generate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        topic: z.string().min(1),
        tone: z.enum(["professional", "casual", "technical", "inspirational"]).default("professional"),
        targetKeywords: z.array(z.string()).optional(),
      });
      const input = schema.parse(req.body);

      const keywordsInstruction = input.targetKeywords?.length
        ? `Target SEO keywords to naturally weave in: ${input.targetKeywords.join(", ")}.`
        : "";

      const systemPrompt = `You are an expert SEO content writer for DW Media Studio, a premium digital media vault and creative tools platform by Dark Wave Studios. The platform helps creators store, organize, edit, and manage all types of digital media — video, audio, images, and documents.

Write in a ${input.tone} tone. Create content that:
- Is genuinely helpful and informative for creators, filmmakers, musicians, and digital artists
- Naturally incorporates SEO keywords without keyword stuffing
- Includes practical tips, insights, or industry knowledge
- Positions DW Media Studio as a knowledgeable authority in digital media management
- Uses proper HTML formatting with h2, h3, p, ul, li, strong, em tags (no h1, that's for the page title)
- Is 800-1500 words in length
${keywordsInstruction}

Respond in valid JSON with this exact structure:
{
  "title": "SEO-optimized title (60 chars max)",
  "excerpt": "Compelling excerpt/teaser (160 chars max)",
  "metaDescription": "SEO meta description (155 chars max)",
  "content": "Full HTML article content",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "category": "One of: media-management, video-production, audio-production, creative-tools, industry-insights, tutorials"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Write a blog post about: ${input.topic}` },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const generated = JSON.parse(content);

      res.json(generated);
    } catch (error) {
      console.error("Error generating blog post:", error);
      res.status(500).json({ message: "Failed to generate blog post" });
    }
  });
}
