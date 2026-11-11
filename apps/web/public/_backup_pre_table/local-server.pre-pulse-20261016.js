import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import pg from "pg";

import { createPostgresTrackerStore } from "./postgres-tracker-store.js";
import { createTrackerDatabaseQuery } from "./tracker-db-query.js";
import { createNeonAuth } from "./neon-auth.js";
import { createTrackerHttpHandler } from "./tracker-http.js";
import { generateQueries, normalizeBraveResponse, normalizeSerpApiResponse, providerFromEnvironment, classifyResult, BORDER_SCOPE, OFFTAKER_QUERY_GUARD } from "./hydrogen-offtaker.js";
import { createHydrogenCandidateStore } from "./hydrogen-offtaker-store.js";
import { evaluateJevCompany } from "./hydrogen-jev.js";
import { INDUSTRIAL_ZONES } from "../../web/public/hydrogen-zones.js";
import { createReoon, loadReoonKey, normalizeEmail } from "../../wind-projects/reoon.mjs";
import { createHydrogenPulse } from "./hydrogen-pulse.js";

const databaseUrl = process.env.TRACKER_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("TRACKER_DATABASE_URL is required to start the tracker");
}

const port = Number(process.env.TRACKER_PORT ?? 9400);
const publicDirectory = join(process.cwd(), "apps", "web", "public");
const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
const query = createTrackerDatabaseQuery({ pool });
const tracker = createPostgresTrackerStore({ query });
const handler = createTrackerHttpHandler({
  tracker,
  authenticate: createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL,
    jwksUrl: process.env.NEON_AUTH_JWKS_URL,
  }),
});
const hydrogenProviders = providerFromEnvironment(process.env);
const hydrogenReoonPromise = loadReoonKey().then((key) => createReoon(key));
const hydrogenPulse = createHydrogenPulse();
const hydrogenCandidates = createHydrogenCandidateStore({ filePath: join(process.cwd(), "data", "hydrogen-offtaker-candidates.json") });
async function hydrogenRequest(request) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const pulseResponse = await hydrogenPulse.handle(request, url);
  if (pulseResponse) return pulseResponse;
  if (request.method === "GET" && url.pathname === "/api/hydrogen/bootstrap") {
    return new Response(JSON.stringify({ mode: "live", notice: "Live mode. Search history and saved candidates are loaded from the local research store.", candidates: await hydrogenCandidates.list(), searchResults: await hydrogenCandidates.listSearchResults(), searchRuns: await hydrogenCandidates.listSearchRuns(), jevRuns: await hydrogenCandidates.listJevRuns(), jevScreenings: await hydrogenCandidates.listJevScreenings(), queries: generateQueries({ sectors: ['Cement and lime', 'Steel and metals', 'Glass'], languages: ['en','pl','de'] }) }), { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  }
  if (request.method === "POST" && url.pathname === "/api/hydrogen/jev-screenings") {
    let input = {}; try { input = await request.json(); } catch { /* defaults are safe */ }
    const runId = `JEV-${randomUUID()}`;
    const evaluatedAt = new Date().toISOString();
    const jobs = INDUSTRIAL_ZONES.flatMap((zone) => (zone.occupants || []).map((occupant) => ({ zone, occupant })));
    const screenings = new Array(jobs.length);
    let cursor = 0;
    const worker = async () => {
      while (true) {
        const index = cursor++;
        if (index >= jobs.length) return;
        const { zone, occupant } = jobs[index];
        try { screenings[index] = await evaluateJevCompany({ zone, occupant, apiKey: input.mode === 'mock' ? null : process.env.TYPESAFE_API_KEY, runId, evaluatedAt }); }
        catch (error) { screenings[index] = { runId, zoneId: zone.id, zoneLabel: zone.label, company: occupant.company, industry: occupant.industry, jevVote: 'Review', jevChoice: 'Review', jevScore: null, jevFactors: {}, jevSummary: `JEV: Review · Evaluation failed: ${error.message}`, jevMode: 'error', evaluatedAt, error: error.message, rawResponse: null }; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, jobs.length) }, worker));
    const saved = await hydrogenCandidates.saveJevRun({ runId, evaluatedAt, mode: input.mode === 'mock' ? 'mock' : process.env.TYPESAFE_API_KEY ? 'live' : 'mock', model: process.env.TYPESAFE_API_KEY && input.mode !== 'mock' ? 'jev-latest' : 'mock', screenings });
    return Response.json({ ...saved, total: screenings.length, mode: saved.jevRun.mode }, { status: 200, headers: { "cache-control": "no-store" } });
  }
  if (request.method === "POST" && url.pathname === "/api/hydrogen/candidates") {
    try { return Response.json(await hydrogenCandidates.save(await request.json()), { status: 201 }); }
    catch (error) { return Response.json({ error: error.message || 'Candidate could not be saved.' }, { status: error.status || 503 }); }
  }
  if (request.method === "POST" && url.pathname === "/api/hydrogen/verify-email") {
    let input = {}; try { input = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 422 }); }
    const email = normalizeEmail(input?.email);
    if (!email) return Response.json({ error: "Email is required." }, { status: 422 });
    const reoon = await hydrogenReoonPromise;
    if (!reoon.enabled) return Response.json({ error: "Reoon unavailable — configure the server key." }, { status: 503 });
    try { return Response.json({ result: await reoon.verify(email) }, { status: 200, headers: { "cache-control": "no-store" } }); }
    catch (error) { return Response.json({ error: error.message || "Reoon verification failed." }, { status: 502 }); }
  }
  if (request.method === "DELETE" && url.pathname === "/api/hydrogen/search-history") {
    const removed = await hydrogenCandidates.clearSearchHistory();
    return Response.json({ ok: true, removed }, { status: 200, headers: { "cache-control": "no-store" } });
  }
  if (request.method === "POST" && url.pathname === "/api/hydrogen/search") {
    let input; try { input = JSON.parse(await request.text()); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 422 }); }
    const provider = input?.provider === 'serpapi' ? 'serpapi' : 'brave';
    const requestedQuery = String(input?.query || '').trim().slice(0, 800);
    const scopedQuery = `${requestedQuery} ${requestedQuery.toLowerCase().includes(OFFTAKER_QUERY_GUARD.toLowerCase()) ? '' : OFFTAKER_QUERY_GUARD} ${requestedQuery.toLowerCase().includes(BORDER_SCOPE.toLowerCase()) ? '' : BORDER_SCOPE}`.replace(/\s+/g, ' ').trim();
    const query = { query: scopedQuery, language: input?.language || 'en', country: input?.country || 'PL', sector: input?.sector || 'Steel and metals', signal: input?.signal || 'process heat', geography: BORDER_SCOPE };
    if (!query.query) return Response.json({ error: "Enter a search query." }, { status: 422 });
    const search = hydrogenProviders[provider];
    if (!search) return Response.json({ provider, mode: "live", error: `${provider === 'brave' ? 'BRAVE_SEARCH_API_KEY' : 'SERPAPI_API_KEY'} is not configured. Add the key server-side and restart the tracker.` }, { status: 503 });
    try {
      const raw = await search(query); const searchedAt = new Date().toISOString();
      const normalised = provider === 'brave' ? normalizeBraveResponse(raw, { provider, query: query.query, searchDate: searchedAt, language: query.language, country: query.country, rawResponseReference: `${provider}:${searchedAt}` }) : normalizeSerpApiResponse(raw, { provider, query: query.query, searchDate: searchedAt, language: query.language, country: query.country, rawResponseReference: `${provider}:${searchedAt}` });
      const results = normalised.map((result) => ({ ...result, classification: classifyResult(result) }));
      const savedRun = await hydrogenCandidates.saveSearchRun({ provider, query: query.query, searchedAt, rawResponse: raw, results });
      return Response.json({ provider, mode: 'live', searchRun: savedRun.searchRun, rawResponse: raw, results: savedRun.results });
    } catch (error) { return Response.json({ provider, mode: 'live', results: [], error: error.message || 'Provider search failed.' }, { status: 502 }); }
  }
  return null;
}
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
      resolve(
        new Request(url, {
          method: request.method,
          headers: request.headers,
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
      "cache-control": "no-store",
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
      const webRequest = await requestFromNode(request);
      const hydrogenResponse = await hydrogenRequest(webRequest);
      if (hydrogenResponse) { response.writeHead(hydrogenResponse.status, Object.fromEntries(hydrogenResponse.headers)); response.end(await hydrogenResponse.text()); return; }
    if (url.pathname.startsWith("/v1/")) {
      const trackerResponse = await handler.fetch(webRequest);
      response.writeHead(trackerResponse.status, Object.fromEntries(trackerResponse.headers));
      response.end(await trackerResponse.text());
      return;
    }

    if (url.pathname === "/auth-config") {
      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end(JSON.stringify({ authUrl: process.env.NEON_AUTH_BASE_URL }));
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
