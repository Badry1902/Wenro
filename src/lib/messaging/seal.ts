import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { dataMode } from "@/lib/env";

/**
 * The guest's manage link is stored only in sealed form (AES-256-GCM). The key lives in the server's
 * environment (MESSAGE_LINK_KEY), never in the database, so a copy of the database cannot open bookings.
 * Generate a key once:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
function key(): Buffer | null {
  const raw = process.env.MESSAGE_LINK_KEY;
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length !== 32) throw new Error("MESSAGE_LINK_KEY must be 32 bytes, base64-encoded");
    return k;
  }
  // Local developer database only: a fixed, obviously-not-secret key.
  if (dataMode() === "localpg") return createHash("sha256").update("wenro-local-development-only").digest();
  return null;
}

const b64u = (b: Buffer) => b.toString("base64url");

export function seal(token: string): string | null {
  const k = key();
  if (!k) return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([c.update(token, "utf8"), c.final(), c.getAuthTag()]);
  return `v1.${b64u(iv)}.${b64u(body)}`;
}

export function unseal(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const k = key();
  const [v, iv, body] = sealed.split(".");
  if (!k || v !== "v1" || !iv || !body) return null;
  try {
    const raw = Buffer.from(body, "base64url");
    const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
    d.setAuthTag(raw.subarray(raw.length - 16));
    return Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString("utf8");
  } catch {
    return null; // wrong key or tampered value: send without a link rather than a broken one
  }
}
