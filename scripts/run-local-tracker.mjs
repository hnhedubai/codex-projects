import { loadLocalTrackerEnvironment } from "./local-tracker-env.mjs";

loadLocalTrackerEnvironment();
await import("../apps/api/src/local-server.js");
