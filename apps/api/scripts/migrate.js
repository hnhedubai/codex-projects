import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationsDirectory = join(here, "../../../database/migrations");
if (!process.env.TRACKER_DATABASE_URL && typeof process.loadEnvFile === "function") {
  try { process.loadEnvFile(".env.local"); } catch {}
}
const connectionString = process.env.TRACKER_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("TRACKER_DATABASE_URL, DATABASE_URL_UNPOOLED, or DATABASE_URL is required for migrations");
}

const client = new pg.Client({ connectionString });
await client.connect();

async function hardenTrackerRoutinePrivileges() {
  await client.query(`
    do $$
    declare
      routine record;
      routine_ref text;
    begin
      for routine in
        select p.oid, p.prokind
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('tracker', 'tracker_read')
      loop
        routine_ref := routine.oid::regprocedure::text;
        if routine.prokind = 'p' then
          execute format('revoke execute on procedure %s from public, tracker_runtime', routine_ref);
        else
          execute format('revoke execute on function %s from public, tracker_runtime', routine_ref);
        end if;
      end loop;

      for routine in
        select
          p.oid,
          p.prokind,
          c.data_operation
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        join tracker.routine_catalog c
          on c.routine_schema = n.nspname
         and c.routine_name = p.proname
         and c.identity_arguments = pg_get_function_identity_arguments(p.oid)
         and c.routine_kind = case when p.prokind = 'p' then 'procedure' else 'function' end
        where n.nspname in ('tracker', 'tracker_read')
          and c.enabled
          and c.data_operation in ('read', 'write')
      loop
        routine_ref := routine.oid::regprocedure::text;
        if routine.prokind = 'p' then
          execute format('grant execute on procedure %s to tracker_runtime', routine_ref);
        else
          execute format('grant execute on function %s to tracker_runtime', routine_ref);
        end if;
      end loop;
    end;
    $$;
  `);
}

try {
  await client.query(`
    create schema if not exists tracker;
    create table if not exists tracker.schema_migrations (
      migration_name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
  const migrationNames = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const applied = new Map((await client.query(
    "select migration_name, checksum from tracker.schema_migrations",
  )).rows.map((row) => [row.migration_name, row.checksum]));
  let appliedCount = 0;
  let skippedCount = 0;

  for (const migrationName of migrationNames) {
    const sql = await readFile(join(migrationsDirectory, migrationName), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previousChecksum = applied.get(migrationName);
    if (previousChecksum) {
      if (previousChecksum !== checksum) {
        throw new Error(`Migration ${migrationName} changed after it was applied; create a new migration instead`);
      }
      skippedCount += 1;
      continue;
    }
    await client.query(sql);
    await hardenTrackerRoutinePrivileges();
    await client.query(
      "insert into tracker.schema_migrations (migration_name, checksum) values ($1, $2)",
      [migrationName, checksum],
    );
    appliedCount += 1;
  }
  await hardenTrackerRoutinePrivileges();
  const result = await client.query(`
    select
      to_regclass('tracker.research_projects') as research_projects,
      to_regclass('tracker.parcels') as parcels,
      to_regprocedure('tracker.create_research_project(text,character)') as create_project,
      to_regprocedure('tracker.create_parcel(uuid,text,numeric)') as create_parcel,
      to_regprocedure('tracker.record_jev_vote(text,uuid,text,text,numeric,text,jsonb,text)') as record_jev_vote
  `);
  console.log("Migrations applied and verified:", { appliedCount, skippedCount, ...result.rows[0] });
} finally {
  await client.end();
}
