import { readFile, writeFile } from "node:fs/promises";
import Exa from "exa-js";

const envText = await readFile("apps/api/.env", "utf8");
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}
const status = JSON.parse(await readFile("apps/web/public/en590-exa-status.json", "utf8"));
const exa = new Exa(process.env.EXA_API_KEY);
const run = await exa.agent.runs.get(status.runId);
await writeFile("apps/web/public/en590-exa-status.json", JSON.stringify({ status: run.status, runId: status.runId, error: run.error ?? null }));

if (run.status === "completed") {
  const output = run.output?.structured ?? { companies: [] };
  let previous = { companies: [] };
  try { previous = JSON.parse(await readFile("apps/web/public/en590-companies.json", "utf8")); } catch { /* First run. */ }
  const existing = Array.isArray(previous.companies) ? previous.companies : [];
  const seen = new Set(existing.map((row) => JSON.stringify([row.company, row.country, row.batch, row.website, row.notes])));
  const additions = (Array.isArray(output.companies) ? output.companies : []).filter((row) => {
    const key = JSON.stringify([row.company, row.country, row.batch, row.website, row.notes]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  await writeFile("apps/web/public/en590-companies.json", JSON.stringify({ market: "Europe", companies: [...existing, ...additions] }, null, 2));
  console.log(JSON.stringify({ status: run.status, newCount: additions.length, totalCount: existing.length + additions.length }, null, 2));
} else {
  console.log(JSON.stringify({ status: run.status, runId: status.runId }, null, 2));
}
