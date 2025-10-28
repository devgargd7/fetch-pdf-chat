import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare a password with a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token and save session to database
 */
export async function generateToken(
  userId: string,
  email: string
): Promise<string> {
  const payload: TokenPayload = { userId, email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);

  // Save session to database
  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify a JWT token and check if session exists in database
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    // Verify JWT
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    // Check if session exists in database and hasn't expired
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      // Session expired, delete it
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<boolean> {
  try {
    await prisma.session.delete({ where: { token } });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get user from token
 */
export async function getUserFromToken(token: string) {
  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength (at least 6 characters)
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}
