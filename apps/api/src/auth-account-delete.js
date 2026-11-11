import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { handleAuthRequest, handleAuthProxyRequest } from "@neondatabase/auth/server";

const execute = promisify(execFile);
const PROJECT = "soft-surf-54764054";
const BRANCH = "br-jolly-unit-b423jpio";
const AUTH_HOST = "ep-falling-river-b4qbvjsk.neonauth.c-6.us-east-2.aws.neon.tech";

export async function deleteBranchUser(userId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error("Invalid auth user ID");
  }
  // Local development only. Credentials remain in the authenticated Neon CLI.
  // All shell arguments are fixed constants except the strictly validated UUID.
  await execute("cmd.exe", ["/d", "/s", "/c",
    `neon neon-auth user delete ${userId} --project-id ${PROJECT} --branch ${BRANCH}`,
  ], { windowsHide: true, timeout: 15000, maxBuffer: 65536 });
}

export function createAccountDeleteHandler({ baseUrl, cookieSecret, removeUser = deleteBranchUser,
  authRequest = handleAuthRequest, authProxy = handleAuthProxyRequest }) {
  if (new URL(baseUrl).hostname !== AUTH_HOST) throw new Error("Account deletion must use the lifecycle v3 branch");
  return async (request) => {
    const fail = (status, message) => Response.json({ message }, { status });
    const origin = new URL(request.url).origin;
    if (request.method !== "POST") return fail(405, "Method not allowed");
    if (request.headers.get("origin") !== origin || origin !== "http://localhost:9500") {
      return fail(403, "Open the account page at http://localhost:9500 to delete your account.");
    }
    let password;
    try { ({ password } = await request.json()); } catch { return fail(400, "Invalid request"); }
    if (typeof password !== "string" || !password || password.length > 1024) return fail(400, "Enter your current password.");
    try {
      // Go upstream, bypassing the SDK's signed session-data cache.
      const sessionResponse = await authRequest(baseUrl, new Request(`${origin}/api/auth/get-session?disableCookieCache=true`, {
        headers: request.headers,
      }), "get-session");
      const session = await sessionResponse.json();
      if (!sessionResponse.ok || !session?.user?.id || !session.user.email) return fail(401, "Please sign in again before deleting your account.");
      const proof = await authRequest(baseUrl, new Request(`${origin}/api/auth/sign-in/email`, {
        method: "POST", headers: request.headers,
        body: JSON.stringify({ email: session.user.email, password }),
      }), "sign-in/email");
      const confirmed = await proof.json();
      if (!proof.ok || confirmed?.user?.id !== session.user.id) return fail(403, "Password confirmation failed. Enter your current password.");
      await removeUser(session.user.id);
      // Clear local session cookies even though upstream sessions are now removed.
      const signedOut = await authProxy({ baseUrl, cookieSecret, path: "sign-out", sameSite: "lax",
        request: new Request(`${origin}/api/auth/sign-out`, { method: "POST", headers: request.headers, body: "{}" }),
      }).catch(() => null);
      const headers = new Headers({ "cache-control": "no-store" });
      for (const cookie of signedOut?.headers.getSetCookie() ?? []) headers.append("set-cookie", cookie);
      return Response.json({ success: true, message: "User deleted" }, { headers });
    } catch {
      return fail(503, "Account deletion could not be confirmed. Please try again shortly.");
    }
  };
}
