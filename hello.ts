import pg from "pg";

import { createNeonAuth } from "./apps/api/src/neon-auth.js";
import { createPostgresTrackerStore } from "./apps/api/src/postgres-tracker-store.js";
import { createTrackerHttpHandler } from "./apps/api/src/tracker-http.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const tracker = createPostgresTrackerStore({ query: pool.query.bind(pool) });
const handler = createTrackerHttpHandler({
  tracker,
  authenticate: createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL,
    jwksUrl: process.env.NEON_AUTH_JWKS_URL,
  }),
});

export default function api(request: Request): Promise<Response> {
  return handler.fetch(request);
}
