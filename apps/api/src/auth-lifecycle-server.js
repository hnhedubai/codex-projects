import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { handleAuthProxyRequest } from "@neondatabase/auth/server";
import { createAccountDeleteHandler } from "./auth-account-delete.js";
import pg from "pg";
import { createTrackerSession } from "./tracker-session.js";
import { createPostgresTrackerStore } from "./postgres-tracker-store.js";
import { createTrackerDatabaseQuery } from "./tracker-db-query.js";
import { createTrackerHttpHandler } from "./tracker-http.js";
import { createParcelDiscovery } from "./parcel-discovery.js";
import { createEvidenceExtractionAgent } from "./evidence-extraction.js";
import { createAgentEventBus } from "./agent-events.js";
import { createReoonEmailVerifier } from "./reoon-email-verifier.js";
import { createReoonVerificationWorker } from "./reoon-verification-worker.js";
import { createCprofileFirecrawlWorker } from "./cprofile-firecrawl-worker.js";
import { createNeonResourceMonitor } from "./neon-resource-monitor.js";
import { createPostgresWorkSignal } from "./postgres-work-signal.js";

const port = Number(process.env.TRACKER_PORT ?? 9500);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).hostname.split(".")[0].replace(/-pooler$/, "") !==
    new URL(process.env.NEON_AUTH_BASE_URL).hostname.split(".")[0]) {
  throw new Error("Tracker and authentication must use the same Neon branch");
}
const pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 10000, statement_timeout: 10000 });
const workSignalPool = new pg.Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED || databaseUrl, max: 1, connectionTimeoutMillis: 10000, statement_timeout: 10000 });
const query = createTrackerDatabaseQuery({ pool });
const authenticate = createTrackerSession({ baseUrl: process.env.NEON_AUTH_BASE_URL, sessionCacheTtlMs: 3000 });
const tracker = createPostgresTrackerStore({ query });
const evidenceAgent = createEvidenceExtractionAgent({ apiKey: process.env.FIRECRAWL_API_KEY });
const agentEventBus = createAgentEventBus();
const reoonVerifier = createReoonEmailVerifier({ apiKey: process.env.REOON_API_KEY });
const reoonWorker = createReoonVerificationWorker({ query, verifier: reoonVerifier, eventBus: agentEventBus });
const reoonTimer = setInterval(() => { void reoonWorker.runOnce().catch(() => {}); }, 5000);
reoonTimer.unref?.();
const cprofileFirecrawlWorker = createCprofileFirecrawlWorker({ query, fetcher: evidenceAgent, eventBus: agentEventBus, maxConcurrent: 1 });
const cprofileFirecrawlTimer = setInterval(() => { void cprofileFirecrawlWorker.runOnce().catch(() => {}); }, 5000);
cprofileFirecrawlTimer.unref?.();
const workSignal = createPostgresWorkSignal({
  pool: workSignalPool,
  onSignal: () => {
    void reoonWorker.kick().catch(() => {});
    void cprofileFirecrawlWorker.kick().catch(() => {});
  },
});
void workSignal.start();
const neonResourceMonitor = createNeonResourceMonitor({ eventBus: agentEventBus });
const neonResourceTimer = setInterval(() => { void neonResourceMonitor.check().catch(() => {}); }, 60000);
neonResourceTimer.unref?.();
const discovery = createParcelDiscovery({ query, evidenceAgent, eventBus: agentEventBus, contactVerificationWorker: reoonWorker });
const adminUserIds = new Set((process.env.TRACKER_ADMIN_USER_IDS || '').split(',').map(value => value.trim()).filter(Boolean));
const trackerHandler = createTrackerHttpHandler({ tracker, discovery, eventBus: agentEventBus, authenticate, adminUserIds });
const deleteAccount = createAccountDeleteHandler({ baseUrl: process.env.NEON_AUTH_BASE_URL, cookieSecret: process.env.NEON_AUTH_COOKIE_SECRET });
const publicDirectory = join(process.cwd(), "apps", "web", "public");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function requestFromNode(request) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  if (["GET", "HEAD"].includes(request.method ?? "GET")) {
    return Promise.resolve(new Request(url, { method: request.method, headers: request.headers }));
  }
  const chunks = [];
  return new Promise((resolve, reject) => {
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      resolve(new Request(url, { method: request.method, headers: request.headers, body: Buffer.concat(chunks) }));
    });
    request.on("error", reject);
  });
}

async function sendWebResponse(response, webResponse) {
  const headers = new Headers(webResponse.headers);
  const setCookies = webResponse.headers.getSetCookie?.();
  headers.delete("set-cookie");
  const nodeHeaders = Object.fromEntries(headers);
  if (setCookies?.length) nodeHeaders["set-cookie"] = setCookies;
  response.writeHead(webResponse.status, nodeHeaders);
  if (webResponse.body && headers.get("content-type")?.startsWith("text/event-stream")) {
    const reader = webResponse.body.getReader();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        if (!response.write(Buffer.from(chunk.value))) await new Promise(resolve => response.once("drain", resolve));
      }
    } catch {
      response.destroy();
    }
    if (!response.destroyed) response.end();
    return;
  }
  response.end(Buffer.from(await webResponse.arrayBuffer()));
}

async function serveStatic(response, pathname) {
  const relativePath = pathname === "/board" || pathname === "/board/" ? "board/index.html" : pathname.slice(1);
  const candidate = normalize(join(publicDirectory, relativePath));
  if (!candidate.startsWith(publicDirectory)) return false;

  try {
    const info = await stat(candidate);
    if (!info.isFile()) return false;
    response.writeHead(200, {
      "content-type": contentTypes[extname(candidate)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(candidate).pipe(response);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "same-origin");
  try {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/tracker" || url.pathname === "/tracker/") {
    response.writeHead(302, { location: "/tracker/dashboard.html" });
    response.end();
    return;
  }
  if (url.pathname.startsWith("/v1/")) {
    await sendWebResponse(response, await trackerHandler.fetch(await requestFromNode(request)));
    return;
  }
  if (url.pathname.startsWith("/tracker/") || url.pathname.startsWith("/board/")) {
    const principal = await authenticate(await requestFromNode(request));
    if (!principal) {
      response.writeHead(302, { location: "/auth/login.html" });
      response.end();
      return;
    }
  }
  if (url.pathname === "/api/auth/delete-user") {
    await sendWebResponse(response, await deleteAccount(await requestFromNode(request)));
    return;
  }
  if (url.pathname.startsWith("/api/auth/")) {
    const authResponse = await handleAuthProxyRequest({
      request: await requestFromNode(request),
      path: url.pathname.slice("/api/auth/".length),
      baseUrl: process.env.NEON_AUTH_BASE_URL,
      cookieSecret: process.env.NEON_AUTH_COOKIE_SECRET,
      sameSite: "lax",
    });
    await sendWebResponse(response, authResponse);
    return;
  }
  if (url.pathname === "/auth-config") {
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify({ authPath: "/api/auth" }));
    return;
  }
  const publicPaths = new Set(["/styles.css", "/auth/auth.css", "/auth/auth-lifecycle.js",
    "/auth/register.html", "/auth/verify.html", "/auth/login.html", "/auth/forgot-password.html",
    "/auth/reset-password.html", "/auth/account.html", "/tracker/", "/tracker/index.html", "/tracker/tracker.js",
    "/board", "/board/", "/board/index.html", "/board/board.css", "/board/board-shell.css", "/board/board.js"]);
  if ((publicPaths.has(url.pathname) || url.pathname.startsWith("/tracker/")) && await serveStatic(response, url.pathname)) return;
  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "not found" }));
  } catch {
    if (!response.headersSent) response.writeHead(503, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Service temporarily unavailable. Please try again." }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Oman Land Tracker auth lifecycle is running at http://localhost:${port}`);
});
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
  clearInterval(reoonTimer);
  clearInterval(cprofileFirecrawlTimer);
  clearInterval(neonResourceTimer);
  workSignal.stop();
  server.close(() => { void workSignalPool.end(); void pool.end(); });
});
