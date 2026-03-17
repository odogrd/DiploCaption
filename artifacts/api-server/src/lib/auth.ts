import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

const SESSION_COOKIE = "diplo_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "default-secret-change-me";

function sign(value: string): string {
  const hmac = createHmac("sha256", SESSION_SECRET);
  hmac.update(value);
  return `${value}.${hmac.digest("hex")}`;
}

function unsign(signed: string): string | false {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return false;
  const value = signed.substring(0, lastDot);
  const expected = sign(value);
  try {
    const signedBuf = Buffer.from(signed);
    const expectedBuf = Buffer.from(expected);
    if (signedBuf.length !== expectedBuf.length) return false;
    if (timingSafeEqual(signedBuf, expectedBuf)) {
      return value;
    }
  } catch {
    return false;
  }
  return false;
}

export function createSession(res: Response): void {
  const payload = `authenticated.${Date.now()}`;
  const signed = sign(payload);
  res.cookie(SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const cookie = req.cookies?.[SESSION_COOKIE];
  if (!cookie) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const result = unsign(cookie);
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function isAuthenticated(req: Request): boolean {
  const cookie = req.cookies?.[SESSION_COOKIE];
  if (!cookie) return false;
  return unsign(cookie) !== false;
}
