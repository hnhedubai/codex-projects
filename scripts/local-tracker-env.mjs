export function loadLocalTrackerEnvironment() {
  process.loadEnvFile(".env.local");
  try { process.loadEnvFile("apps/api/.env"); } catch { /* optional provider credentials */ }

  if (!process.env.TRACKER_DATABASE_URL && process.env.DATABASE_URL) {
    process.env.TRACKER_DATABASE_URL = process.env.DATABASE_URL;
  }

  if (!process.env.TRACKER_DATABASE_URL) {
    throw new Error(".env.local must define DATABASE_URL or TRACKER_DATABASE_URL for local tracker commands");
  }
}
