# Wind Projects — standalone opportunity desk

Start from this directory with `npm start`, then open http://localhost:9601/wind-projects . Node.js is the only runtime dependency. Run `npm test` for data and HTTP checks.

The server binds to 127.0.0.1 only, does not replace other services, and exits if its port is occupied. No CRM, Google Sheets, outbound email service or production database is connected. An explicitly requested Reoon check sends the saved email addresses to Reoon; it does not send an email message.

Wind Projects uses **http://localhost:9601/wind-projects** by default. Set `WIND_PORT` only when a different port is intentionally required.

## Data and storage

- `dist/data.js`: 19 structured imported project leads, references, contacts and explicit research gaps. Imported claims are not newly verified research; active deal availability, job titles and mailbox delivery need rechecking.
- `dist/app.js`: views, filters, local priorities, review checklist, notes and outreach drafts.
- Notes are stored in browser localStorage at this origin. They are not written back to the project files. Changing browser/profile/origin or clearing site data can make them unavailable.
- Export workspace creates a JSON backup including research and notes. Import notes validates the version, imports only known project IDs and allows only supported note fields. It asks before replacing matching notes; research records are not overwritten.
- Imported contact details retain their original provenance. Reoon mailbox checks are dated and separate from identity/role confirmation; unknown and catch-all are not positive results.
- Contacts, phone numbers, original records, edit history and exact Reoon responses are saved in `private/contacts.json`, with a previous-file `.bak`. This directory is never served as static files and is Git-ignored. Do not run multiple servers or batch writers against the same store.
- Every contact card, including new cards, has a Reoon check button. It is disabled without an email or server key. Clicking immediately rechecks the saved addresses and preserves prior results. A status icon exposes the exact result on hover or click.
- Export includes contacts and verification results; Import notes still restores browser notes only, not server contact data. Back up the private directory to preserve the editable contact store and full history.
- Diligence ticks mean a question was reviewed, not that a project has passed due diligence.

## Future integration boundary

Keep project IDs stable. The local contact API is independent of the hydrogen/CRM applications. No background research, scheduling or outbound messaging is implemented.

## Reoon configuration

Set `REOON_API_KEY`, `APOLLO_API_KEY` and/or `HUNTER_API_KEY` in the server process environment. Alternatively set `REOON_ENV_FILE` to an existing trusted local env file; the loader reads only these provider keys and does not copy them. In this repository, the local fallback files are `apps/api/.env` and the repository `.env.local`. Keys are never returned to the browser. Apollo enrichment and Hunter finding/verifying are explicit per-contact actions and may consume provider credits; results are saved to local provider history and never overwrite manual contact fields automatically. Restart the server after changing keys.

Initial imported contacts were checked using one bounded 18-address bulk task on 15 October 2026. Two user-reported invalid RWE addresses were skipped. The one-off `verify-existing.mjs` script records its task ID before polling to avoid duplicate credit spending; it is not an automatic scheduled job.
