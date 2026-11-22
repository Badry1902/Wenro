/**
 * Sign-in sessions end when the browser closes and after 12 hours without activity.
 *  - Sign-in cookies are written without an expiry (browser-session cookies), so closing the browser
 *    signs the person out and the next visitor starts as a guest.
 *  - `wenro_seen` holds the time of the last request; the middleware signs out a session that has been
 *    idle for more than IDLE_LIMIT_S, or that has lost this cookie (browser restarted with old cookies).
 * Shared by the middleware (Edge) and the server, so no Node-only imports here.
 */
export const SEEN_COOKIE = "wenro_seen";
export const IDLE_LIMIT_S = 12 * 60 * 60;
/** Rewrite the activity cookie at most this often (keeps responses cacheable and cookies quiet). */
export const SEEN_REFRESH_S = 5 * 60;
export const DEV_USER_COOKIE = "wenro_dev_uid";

export const nowS = () => Math.floor(Date.now() / 1000);

/** Supabase sign-in cookies (chunked: sb-<ref>-auth-token, .0, .1 …) and the local developer cookie. */
export const isAuthCookie = (name: string) => (name.startsWith("sb-") && name.includes("-auth-token")) || name === DEV_USER_COOKIE;

type Opts = { maxAge?: number; expires?: Date | number | string; [k: string]: unknown };
/** Same cookie, but kept only until the browser closes. Deletions (empty value / maxAge 0) pass unchanged. */
export function sessionOnly<T extends Opts>(value: string, options: T | undefined): T {
  const o = { ...(options ?? {}) } as T;
  if (!value || o.maxAge === 0) return o;
  delete o.maxAge;
  delete o.expires;
  return o;
}

export const seenCookie = (secure: boolean) => ({
  name: SEEN_COOKIE, value: String(nowS()),
  options: { httpOnly: true, sameSite: "lax" as const, secure, path: "/" },
});
