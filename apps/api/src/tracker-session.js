import { handleAuthRequest } from "@neondatabase/auth/server";

export function createTrackerSession({ baseUrl, authRequest = handleAuthRequest, sessionCacheTtlMs = 0 }) {
  const cache = new Map();
  const inFlight = new Map();
  return async (request) => {
    const url = new URL(request.url);
    if (!["GET", "HEAD"].includes(request.method) && request.headers.get("origin") !== url.origin) return null;
    if (!request.headers.get("cookie")) return null;
    const cookie = request.headers.get("cookie");
    const cached = cache.get(cookie);
    if (cached && cached.expiresAt > Date.now()) return cached.principal;
    if (inFlight.has(cookie)) return inFlight.get(cookie);
    const verification = (async () => {
      const response = await authRequest(baseUrl, new Request(`${url.origin}/api/auth/get-session?disableCookieCache=true`, {
        headers: request.headers, signal: AbortSignal.timeout(10000),
      }), "get-session");
      if (!response.ok) return null;
      const session = await response.json();
      const expiresAt = Date.parse(session?.session?.expiresAt);
      if (!session?.user?.id || session.user.emailVerified !== true ||
          !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
      const principal = { id: session.user.id };
      if (sessionCacheTtlMs > 0) cache.set(cookie, { principal, expiresAt: Math.min(expiresAt, Date.now() + sessionCacheTtlMs) });
      return principal;
    })();
    inFlight.set(cookie, verification);
    try { return await verification; } finally { inFlight.delete(cookie); }
  };
}
