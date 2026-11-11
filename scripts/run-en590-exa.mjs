import { readFile, writeFile } from "node:fs/promises";
import Exa from "exa-js";

const envText = await readFile("apps/api/.env", "utf8");
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}

if (!process.env.EXA_API_KEY) throw new Error("EXA_API_KEY is not configured in apps/api/.env");

const exa = new Exa(process.env.EXA_API_KEY);
const region = process.env.EN590_REGION ?? "Europe";
await writeFile("apps/web/public/en590-exa-status.json", JSON.stringify({ status: "starting" }));
const run = await exa.agent.runs.create({
  effort: "auto",
  query: `Find at least 30 distinct OPEN, UNFULFILLED EN590 10ppm diesel tenders or active procurement requests in ${region} during calendar year 2026, seeking cargoes of 30,000 to 80,000 MT for CIF delivery into ${region} destination markets. Return one company record for each distinct tender or procurement request, not one record per company; the same legal entity may appear more than once when it has separate open tenders. Return only active or open 2026 tenders, RFQs, procurement notices, import requirements, purchase mandates, or buyer requests where the buying process is still open or the supply requirement remains unfulfilled. Clearly state the tender or request date, deadline, current status, requested quantity, destination, delivery terms, buyer legal entity, and source in notes. Exclude completed purchases, historical demand, generic annual consumption, signed and fulfilled supply agreements, expired tenders, marketplace leads, anonymous requests, and proposed deals without a verifiable open buying process.`,
  outputSchema: {
    type: "object",
    properties: {
      companies: {
        type: "array",
        maxItems: 50,
        items: {
          type: "object",
          properties: {
            company: { type: "string" }, website: { type: "string" }, type: { type: "string" }, country: { type: "string" }, batch: { type: "string" }, linkedin_company_page: { type: "string" }, notes: { type: "string" }, sources: { type: "array", items: { type: "string" } },
          },
          required: ["company", "website", "type", "country", "batch", "linkedin_company_page", "notes", "sources"],
        },
      },
    },
    required: ["companies"],
  },
});
await writeFile("apps/web/public/en590-exa-status.json", JSON.stringify({ status: "created", runId: run.id }));

const finished = await exa.agent.runs.pollUntilFinished(run.id, { pollInterval: 4000 });
await writeFile("apps/web/public/en590-exa-status.json", JSON.stringify({ status: finished.status, error: finished.error ?? null }));
if (finished.status !== "completed") throw new Error(`${finished.status}: ${finished.error ?? "Exa run failed"}`);

const structured = finished.output?.structured ?? { companies: [] };
let previous = { companies: [] };
try { previous = JSON.parse(await readFile("apps/web/public/en590-companies.json", "utf8")); } catch { /* First run. */ }
const existing = Array.isArray(previous.companies) ? previous.companies : [];
const seen = new Set(existing.map((row) => JSON.stringify([row.company, row.country, row.batch, row.website, row.notes])));
const additions = (Array.isArray(structured.companies) ? structured.companies : []).filter((row) => {
  const key = JSON.stringify([row.company, row.country, row.batch, row.website, row.notes]);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
const merged = { market: region, companies: [...existing, ...additions] };
await writeFile("apps/web/public/en590-companies.json", JSON.stringify(merged, null, 2));
console.log(JSON.stringify({ status: finished.status, newCount: additions.length, totalCount: merged.companies.length }, null, 2));
