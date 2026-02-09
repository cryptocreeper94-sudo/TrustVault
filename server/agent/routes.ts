import type { Express, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { storage } from "../storage";
import { db } from "../db";
import { conversations, messages } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

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

function getSystemPrompt(userName: string, tenantId: string, mediaStats: { total: number; images: number; videos: number; audio: number; documents: number }) {
  return `You are Spinny, the TrustVault AI assistant. You are a friendly, helpful vinyl record mascot with googly eyes and a big smile. You live inside the DW Media Studio / TrustVault app.

Your personality:
- Warm, upbeat, and encouraging
- You love music and media of all kinds
- You use casual, friendly language but stay professional
- Keep responses concise and helpful (2-3 sentences when possible)
- Never use emojis

Current user: ${userName} (tenant: ${tenantId})
Their vault stats: ${mediaStats.total} total items (${mediaStats.images} images, ${mediaStats.videos} videos, ${mediaStats.audio} audio, ${mediaStats.documents} documents)

What you can help with:
- Organizing media: suggest collections, tags, and ways to group content
- Finding content: help users describe what they're looking for
- Tips on using TrustVault features (upload, collections, favorites, playlists, ambient mode, now playing)
- General media advice (file formats, best practices for storing media)
- Explaining TrustVault features and the DarkWave Studios ecosystem
- Answering questions about subscription tiers (Free, Personal $5.99/mo, Pro $12.99/mo, Studio $24.99/mo)

What you cannot do:
- You cannot directly move, delete, or modify files
- You cannot access external services or download content
- You cannot provide legal advice about copyright (but can mention that users should upload content they own)

TrustVault is part of the DarkWave Studios / TrustLayer ecosystem. The broader vision includes blockchain identity, trust-based access, and cross-platform media management.

Be helpful, be fun, and keep it brief.`;
}

async function verifyConversationOwnership(conversationId: number, tenantId: string) {
  const [conv] = await db.select().from(conversations).where(
    and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId))
  );
  return conv;
}

export function registerAgentRoutes(app: Express): void {
  app.get("/api/agent/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = req.session.tenantId!;
      const result = await db.select().from(conversations)
        .where(eq(conversations.tenantId, tenantId))
        .orderBy(desc(conversations.createdAt));
      res.json(result);
    } catch (error) {
      console.error("Error fetching agent conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/agent/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = req.session.tenantId!;
      const [conversation] = await db.insert(conversations).values({
        title: req.body.title || "Chat with Spinny",
        tenantId,
      }).returning();
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating agent conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/agent/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const tenantId = req.session.tenantId!;
      const conv = await verifyConversationOwnership(id, tenantId);
      if (!conv) return res.status(404).json({ error: "Not found" });

      await db.delete(messages).where(eq(messages.conversationId, id));
      await db.delete(conversations).where(eq(conversations.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting agent conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/agent/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id as string);
      const { content } = req.body;
      const userName = req.session.name || "User";
      const tenantId = req.session.tenantId || "default";

      const conv = await verifyConversationOwnership(conversationId, tenantId);
      if (!conv) return res.status(404).json({ error: "Not found" });

      await db.insert(messages).values({ conversationId, role: "user", content });

      let mediaStats = { total: 0, images: 0, videos: 0, audio: 0, documents: 0 };
      try {
        const items = await storage.getMediaItems(tenantId);
        mediaStats.total = items.length;
        mediaStats.images = items.filter(i => i.category === "image").length;
        mediaStats.videos = items.filter(i => i.category === "video").length;
        mediaStats.audio = items.filter(i => i.category === "audio").length;
        mediaStats.documents = items.filter(i => i.category === "document").length;
      } catch {}

      const history = await db.select().from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: getSystemPrompt(userName, tenantId, mediaStats) },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 1024,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      }

      await db.insert(messages).values({ conversationId, role: "assistant", content: fullResponse });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in agent message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Something went wrong" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });

  app.get("/api/agent/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id as string);
      const tenantId = req.session.tenantId!;

      const conv = await verifyConversationOwnership(conversationId, tenantId);
      if (!conv) return res.status(404).json({ error: "Not found" });

      const result = await db.select().from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);
      res.json(result);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/agent/tts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      const truncated = text.slice(0, 2000);
      const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

      if (elevenLabsKey) {
        try {
          const voiceId = "EXAVITQu4vr4xnSDxMaL";
          const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: {
              "Accept": "audio/mpeg",
              "Content-Type": "application/json",
              "xi-api-key": elevenLabsKey,
            },
            body: JSON.stringify({
              text: truncated,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.3,
                use_speaker_boost: true,
              },
            }),
          });

          if (ttsRes.ok && ttsRes.body) {
            res.setHeader("Content-Type", "audio/mpeg");
            res.setHeader("X-TTS-Provider", "elevenlabs");
            const arrayBuffer = await ttsRes.arrayBuffer();
            res.send(Buffer.from(arrayBuffer));
            return;
          }
          console.warn("ElevenLabs TTS failed, status:", ttsRes.status, "falling back to OpenAI");
        } catch (err) {
          console.warn("ElevenLabs TTS error, falling back to OpenAI:", err);
        }
      }

      try {
        const audioRes = await openai.chat.completions.create({
          model: "gpt-audio",
          messages: [
            { role: "system", content: "You are a friendly AI assistant named Spinny. Read the following text aloud exactly as written, with a warm and upbeat tone. Do not add any extra words or commentary." },
            { role: "user", content: truncated },
          ],
          modalities: ["text", "audio"],
          audio: { voice: "nova", format: "mp3" },
        });

        const audioData = (audioRes.choices[0]?.message as any)?.audio?.data;
        if (audioData) {
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("X-TTS-Provider", "openai");
          res.send(Buffer.from(audioData, "base64"));
          return;
        }
        throw new Error("No audio data in OpenAI response");
      } catch (openaiErr) {
        console.error("OpenAI TTS fallback failed:", openaiErr);
        res.status(503).json({ error: "Voice is temporarily unavailable" });
      }
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });
}
