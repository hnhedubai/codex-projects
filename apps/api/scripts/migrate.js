import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationsDirectory = join(here, "../../../database/migrations");
const connectionString = process.env.TRACKER_DATABASE_URL;

if (!connectionString) {
  throw new Error("TRACKER_DATABASE_URL is required for migrations");
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const migrationNames = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const migrationName of migrationNames) {
    await client.query(await readFile(join(migrationsDirectory, migrationName), "utf8"));
  }
  const result = await client.query(`
    select
      to_regclass('tracker.research_projects') as research_projects,
      to_regclass('tracker.parcels') as parcels,
      to_regprocedure('tracker.create_research_project(text,character)') as create_project,
      to_regprocedure('tracker.create_parcel(uuid,text,numeric)') as create_parcel,
      to_regprocedure('tracker.record_jev_vote(text,uuid,text,text,numeric,text,jsonb,text)') as record_jev_vote
  `);
  console.log("Migration applied and verified:", result.rows[0]);
} finally {
  await client.end();
}
