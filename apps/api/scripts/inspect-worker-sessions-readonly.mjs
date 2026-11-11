import pg from "pg";
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) { const i = line.indexOf("="); if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).replace(/^['\"]|['\"]$/g, ""); }
const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
await client.connect();
const result = await client.query(`select pid, usename, application_name, state, query, query_start from pg_stat_activity where usename = current_user order by query_start desc nulls last limit 20`);
console.log(JSON.stringify(result.rows, null, 2));
await client.end();
