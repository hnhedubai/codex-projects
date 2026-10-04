import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import pg from "pg";

import { createPostgresTrackerStore } from "./postgres-tracker-store.js";
import { createTrackerHttpHandler } from "./tracker-http.js";

const databaseUrl = process.env.TRACKER_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("TRACKER_DATABASE_URL is required to start the tracker");
}

const port = Number(process.env.TRACKER_PORT ?? 9400);
const publicDirectory = join(process.cwd(), "apps", "web", "public");
const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
const tracker = createPostgresTrackerStore({ query: pool.query.bind(pool) });
const handler = createTrackerHttpHandler({
  tracker,
  authenticate: async (request) =>
    request.headers.get("x-tracker-local-principal") === "local-developer"
      ? { id: "local-developer" }
      : null,
});
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function requestFromNode(request) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  if (["GET", "HEAD"].includes(request.method ?? "GET")) {
    const headers = new Headers(request.headers);
    headers.set("x-tracker-local-principal", "local-developer");
    return Promise.resolve(new Request(url, { method: request.method, headers }));
  }
  const chunks = [];
  return new Promise((resolve, reject) => {
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      resolve(
        new Request(url, {
          method: request.method,
          headers: new Headers({ ...request.headers, "x-tracker-local-principal": "local-developer" }),
          body: ["GET", "HEAD"].includes(request.method ?? "GET")
            ? undefined
            : Buffer.concat(chunks),
        }),
      );
    });
    request.on("error", reject);
  });
}

async function serveStatic(response, pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const candidate = normalize(join(publicDirectory, relativePath));
  if (!candidate.startsWith(publicDirectory)) return false;

  try {
    const info = await stat(candidate);
    if (!info.isFile()) return false;
    response.writeHead(200, {
      "content-type": contentTypes[extname(candidate)] ?? "application/octet-stream",
    });
    createReadStream(candidate).pipe(response);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    if (url.pathname.startsWith("/v1/")) {
      const trackerResponse = await handler.fetch(await requestFromNode(request));
      response.writeHead(trackerResponse.status, Object.fromEntries(trackerResponse.headers));
      response.end(await trackerResponse.text());
      return;
    }

    if (await serveStatic(response, url.pathname)) return;
    response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "not found" }));
  } catch (error) {
    console.error(error);
    response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "internal server error" }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Oman Land Tracker is running at http://localhost:${port}`);
});

async function close() {
  server.close();
  await pool.end();
}

process.once("SIGINT", close);
process.once("SIGTERM", close);
