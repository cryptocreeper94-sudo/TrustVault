import { type Express, type Request, type Response } from "express";
import { storage } from "../storage";
import {
  generateTrustLayerId,
  generateJWT,
  verifyJWT,
  hashPassword,
  comparePassword,
  validateChatPassword,
  randomAvatarColor,
} from "../trustlayer-sso";

export function registerChatAuthRoutes(app: Express): void {
  app.post("/api/chat/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password, displayName } = req.body;

      if (!username || !email || !password || !displayName) {
        return res.status(400).json({ success: false, message: "All fields are required: username, email, password, displayName" });
      }

      const passwordError = validateChatPassword(password);
      if (passwordError) {
        return res.status(400).json({ success: false, message: passwordError });
      }

      const existingUsername = await storage.getChatUserByUsername(username.trim());
      if (existingUsername) {
        return res.status(409).json({ success: false, message: "Username already taken" });
      }

      const existingEmail = await storage.getChatUserByEmail(email.trim().toLowerCase());
      if (existingEmail) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const trustLayerId = generateTrustLayerId();
      const avatarColor = randomAvatarColor();

      const user = await storage.createChatUser({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        displayName: displayName.trim(),
        avatarColor,
        role: "member",
        trustLayerId,
      });

      const token = generateJWT(user.id, trustLayerId);

      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          avatarColor: user.avatarColor,
          role: user.role,
          trustLayerId: user.trustLayerId,
        },
        token,
      });
    } catch (err) {
      console.error("Chat register error:", err);
      return res.status(500).json({ success: false, message: "Registration failed" });
    }
  });

  app.post("/api/chat/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required" });
      }

      const user = await storage.getChatUserByUsername(username.trim());
      if (!user) {
        return res.status(401).json({ success: false, message: "Invalid username or password" });
      }

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ success: false, message: "Invalid username or password" });
      }

      const token = generateJWT(user.id, user.trustLayerId || "");

      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          avatarColor: user.avatarColor,
          role: user.role,
          trustLayerId: user.trustLayerId,
        },
        token,
      });
    } catch (err) {
      console.error("Chat login error:", err);
      return res.status(500).json({ success: false, message: "Login failed" });
    }
  });

  app.get("/api/chat/auth/me", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = verifyJWT(token);
      if (!decoded) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
      }

      const user = await storage.getChatUserById(decoded.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          avatarColor: user.avatarColor,
          role: user.role,
          trustLayerId: user.trustLayerId,
        },
      });
    } catch (err) {
      console.error("Chat me error:", err);
      return res.status(500).json({ success: false, message: "Failed to get user" });
    }
  });

  app.get("/api/chat/channels", async (_req: Request, res: Response) => {
    try {
      const channels = await storage.getChatChannels();
      return res.json({ success: true, channels });
    } catch (err) {
      console.error("Chat channels error:", err);
      return res.status(500).json({ success: false, message: "Failed to get channels" });
    }
  });

  app.get("/api/chat/channels/:channelId/messages", async (req: Request, res: Response) => {
    try {
      const channelId = req.params.channelId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getChatMessages(channelId, limit);
      return res.json({ success: true, messages });
    } catch (err) {
      console.error("Chat messages error:", err);
      return res.status(500).json({ success: false, message: "Failed to get messages" });
    }
  });
}
