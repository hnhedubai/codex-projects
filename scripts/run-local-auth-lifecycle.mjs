import { randomBytes } from "node:crypto";

// Load the conventional root .env first, then the repository's local override.
// Existing process values remain authoritative; secrets are never printed.
try { process.loadEnvFile(".env"); } catch { /* optional root environment file */ }
process.loadEnvFile(".env.local");
// Node's env-file loader may preserve surrounding quotes on this Windows setup;
// URL consumers need the actual URL value rather than the serialized .env token.
for (const key of ["DATABASE_URL", "DATABASE_URL_UNPOOLED", "NEON_AUTH_BASE_URL", "NEON_AUTH_JWKS_URL"]) {
  if (process.env[key]) process.env[key] = process.env[key].trim().replace(/^([\"'])(.*)\1$/, "$2");
}
// The API integration credentials live with the API package. Do not overwrite
// values already supplied by the root environment file.
try { process.loadEnvFile("apps/api/.env"); } catch { /* optional local API env */ }
if (!process.env.NEON_AUTH_BASE_URL) {
  throw new Error(".env.local must define NEON_AUTH_BASE_URL for the local auth lifecycle");
}
process.env.NEON_AUTH_COOKIE_SECRET ??= randomBytes(48).toString("base64url");
process.env.TRACKER_PORT ??= "9500";
await import("../apps/api/src/auth-lifecycle-server.js");
