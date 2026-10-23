# Pulse backend: read-only investigation handoff

Saved: 2026-10-23

The earlier Pulse implementation record identified the backend folder as:

`C:\Users\mohdz\Projects\unified-crm-platform\apps\api`

These paths are historical references, not a fresh verification of current contents.

## Prompt for Claude

Request read-only access to that exact folder. Start with:

- `src\routes\pulse.ts`
- `src\lib\email\send.ts`
- `src\lib\email\logEmail.ts`
- `src\middleware\pulseSendAuth.ts`

Inspect `/api/pulse/external/send` and its provider wrapper to complete
`pulse-threaded-followup-investigation.md`.

Verify the meaning of `emailMessageId`, supported reply/thread parameters,
RFC Message-ID and References persistence, recipient/sender handling,
reply detection and retry idempotency. Distinguish verified implementation
from proposals. Report exact contracts with file and line references.

Do not read credentials, modify code, or send emails. If access is denied,
stop and report the boundary; do not use another route to bypass it.
