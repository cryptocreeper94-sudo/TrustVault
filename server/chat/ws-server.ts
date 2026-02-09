import { WebSocketServer, WebSocket } from "ws";
import { type Server } from "http";
import { verifyJWT } from "../trustlayer-sso";
import { storage } from "../storage";

interface ChatClient {
  ws: WebSocket;
  userId: string;
  username: string;
  avatarColor: string;
  role: string;
  channelId: string | null;
}

const clients = new Map<WebSocket, ChatClient>();

function broadcast(channelId: string, data: any, excludeWs?: WebSocket) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.channelId === channelId && client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

function getChannelUsers(channelId: string): string[] {
  const users: string[] = [];
  clients.forEach((client) => {
    if (client.channelId === channelId) {
      users.push(client.username);
    }
  });
  return Array.from(new Set(users));
}

function getPresence(): { onlineCount: number; channelUsers: Record<string, string[]> } {
  const channelUsers: Record<string, string[]> = {};
  const allUsers = new Set<string>();
  clients.forEach((client) => {
    allUsers.add(client.userId);
    if (client.channelId) {
      if (!channelUsers[client.channelId]) channelUsers[client.channelId] = [];
      if (!channelUsers[client.channelId].includes(client.username)) {
        channelUsers[client.channelId].push(client.username);
      }
    }
  });
  return { onlineCount: allUsers.size, channelUsers };
}

function broadcastPresence() {
  const presence = getPresence();
  const message = JSON.stringify({ type: "presence", ...presence });
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

export function setupChatWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });

  wss.on("connection", (ws: WebSocket) => {
    let authenticated = false;

    const timeout = setTimeout(() => {
      if (!authenticated) {
        ws.send(JSON.stringify({ type: "error", message: "Authentication timeout" }));
        ws.close();
      }
    }, 10000);

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === "join") {
          if (!data.token) {
            ws.send(JSON.stringify({ type: "error", message: "Token required" }));
            return;
          }

          const decoded = verifyJWT(data.token);
          if (!decoded) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
            ws.close();
            return;
          }

          const user = await storage.getChatUserById(decoded.userId);
          if (!user) {
            ws.send(JSON.stringify({ type: "error", message: "User not found" }));
            ws.close();
            return;
          }

          authenticated = true;
          clearTimeout(timeout);

          const channelId = data.channelId || null;

          clients.set(ws, {
            ws,
            userId: user.id,
            username: user.username,
            avatarColor: user.avatarColor,
            role: user.role,
            channelId,
          });

          await storage.updateChatUserOnline(user.id, true);

          if (channelId) {
            const messages = await storage.getChatMessages(channelId);
            ws.send(JSON.stringify({ type: "history", messages }));
          }

          if (channelId) {
            broadcast(channelId, {
              type: "user_joined",
              userId: user.id,
              username: user.username,
            }, ws);
          }

          broadcastPresence();
          return;
        }

        const client = clients.get(ws);
        if (!client) {
          ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
          return;
        }

        if (data.type === "switch_channel") {
          const oldChannel = client.channelId;
          client.channelId = data.channelId;

          if (oldChannel) {
            broadcast(oldChannel, {
              type: "user_left",
              userId: client.userId,
              username: client.username,
            });
          }

          if (data.channelId) {
            const messages = await storage.getChatMessages(data.channelId);
            ws.send(JSON.stringify({ type: "history", messages }));

            broadcast(data.channelId, {
              type: "user_joined",
              userId: client.userId,
              username: client.username,
            }, ws);
          }

          broadcastPresence();
          return;
        }

        if (data.type === "message") {
          if (!client.channelId) {
            ws.send(JSON.stringify({ type: "error", message: "Not in a channel" }));
            return;
          }

          let content = (data.content || "").trim();
          if (!content) return;
          if (content.length > 2000) content = content.slice(0, 2000);

          const msg = await storage.createChatMessage({
            channelId: client.channelId,
            userId: client.userId,
            content,
            replyToId: data.replyToId || undefined,
          });

          broadcast(client.channelId, {
            type: "message",
            id: msg.id,
            channelId: msg.channelId,
            userId: client.userId,
            username: client.username,
            avatarColor: client.avatarColor,
            role: client.role,
            content: msg.content,
            replyToId: msg.replyToId,
            createdAt: msg.createdAt,
          });
          return;
        }

        if (data.type === "typing") {
          if (client.channelId) {
            broadcast(client.channelId, {
              type: "typing",
              userId: client.userId,
              username: client.username,
            }, ws);
          }
          return;
        }
      } catch (err) {
        console.error("WS message error:", err);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      }
    });

    ws.on("close", async () => {
      clearTimeout(timeout);
      const client = clients.get(ws);
      if (client) {
        await storage.updateChatUserOnline(client.userId, false);

        if (client.channelId) {
          broadcast(client.channelId, {
            type: "user_left",
            userId: client.userId,
            username: client.username,
          });
        }

        clients.delete(ws);
        broadcastPresence();
      }
    });

    ws.on("error", (err) => {
      console.error("WS error:", err);
      const client = clients.get(ws);
      if (client) {
        clients.delete(ws);
        broadcastPresence();
      }
    });
  });
}
