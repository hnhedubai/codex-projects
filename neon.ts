import { defineConfig } from "@neon/config/v1";

// Seeded by `neon config init --from-branch` from production.
// The AI Gateway is not readable from a branch (always available, credential-gated), so add
// `aiGateway: true` if the policy should declare it.
export default defineConfig({
  auth: true,
  buckets: {
    "codex-projects": { access: "private" },
  },
  functions: {
    api: { name: "api", source: "./hello.ts" },
  },
});
