import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-me";
const JWT_ISSUER = "trust-layer-sso";
const JWT_EXPIRY = "7d";
const BCRYPT_ROUNDS = 12;

export interface JWTPayload {
  userId: string;
  trustLayerId: string;
  iss: string;
}

export function generateTrustLayerId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString("hex").slice(0, 8);
  return `tl-${timestamp}-${random}`;
}

export function generateJWT(userId: string, trustLayerId: string): string {
  return jwt.sign(
    { userId, trustLayerId, iss: JWT_ISSUER },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY, algorithm: "HS256" }
  );
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as JWTPayload;
    if (decoded.iss !== JWT_ISSUER) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,}$/;

export function validateChatPassword(password: string): string | null {
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) return "Password must contain at least one special character";
  return null;
}

const AVATAR_COLORS = [
  "#06b6d4", "#8b5cf6", "#ec4899", "#f97316",
  "#10b981", "#3b82f6", "#ef4444", "#eab308",
  "#14b8a6", "#a855f7", "#f43f5e", "#22c55e",
];

export function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}
