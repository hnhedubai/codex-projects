import { loadLocalTrackerEnvironment } from "./local-tracker-env.mjs";

loadLocalTrackerEnvironment();
await import("../apps/api/scripts/migrate.js");
