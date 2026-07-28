import { randomBytes, createHash } from "crypto";

export const SESSION_COOKIE = "ilkoku_session";

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
