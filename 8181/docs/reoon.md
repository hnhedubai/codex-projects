# Local Reoon verification

8181 owns its verifier code in `platform-shell/server/reoon.mjs` and the result
store in `platform-shell/data/reoon-results.json`. No other application's code
or server is required. The current private credential is read from the existing
server secret file named by `REOON_ENV_FILE` in the unserved `.env.local` file.
To use a dedicated credential, set `REOON_API_KEY` in the server environment or
the local `.env.local` instead. Never put a key in browser JavaScript.

- `GET /api/reoon/status`: checks account connectivity; balance cached five minutes.
- `GET /api/reoon/results`: saved mailbox results, without raw provider payloads.
- `POST /api/reoon/verify`: one to five sourced or explicitly user-entered addresses in `emails`.
- Contacts cards expose per-address verification and a connection check.

Checks use Power mode, run serially and deduplicate by normalized email. Existing
results are reused (including unsafe/unknown results) to prevent accidental
repeat spending. There is no automatic bulk scan, timer, speculative-pattern
verification or outbound email. Saving a contact with an email automatically
checks that one address, after the contact has been saved locally. Duplicate
or cached addresses reuse existing results without new charges. A failure
never deletes the saved contact; its card shows the failure and permits retry.
Manual entries need no source URL: their provenance is explicitly recorded as
user-entered, mailbox check only, not independently verified person-email identity.
Other imported routes still require a source URL. Module, record, name, address
and any supplied source are retained. Adding a name without email makes no call.

All seven portfolio modules use the same contact registry, backend, result
cache and contact cards: Wind, Investors/JV, Hydrogen, EN590, e-SAF, Ammonia,
and Other Gases. Each module owns its contact snapshot in its own data folder.
Hydrogen, e-SAF, Ammonia and Other Gases currently have empty contact snapshots;
integration does not imply that contact research or verification has occurred.
NDA Guard is a document-review tool and has no contact portfolio to verify.

The raw provider response and timestamp are retained atomically on the server;
API credentials are never persisted with results. Back up this private result
file with the app's local data; it is excluded from Git and static serving.
Safe mailbox results do not establish a person-email association. Corporate
routes, role accounts, catch-all and unknown results stay separate. Verification
ticks use structured Reoon Power results, never prose containing "verified".

Research snapshots retain their original no-verification statements as dated
provenance. The per-address Reoon label shows the subsequent live check.

## Reliability safeguards

- Provider headers and response bodies have one 90-second deadline. Paid requests
  are never automatically retried: a timeout can mean the provider processed it.
- At most ten verification batches may be queued; overflow returns HTTP 429.
- Concurrent connection checks share one call. Success is cached five minutes;
  failures have a 30-second cooldown. Saving a result invalidates the balance cache.
- Result files are flushed before atomic replacement. Transient Windows rename
  locks receive bounded local retries, not new paid calls. If saving still fails,
  the completed answer is retained in memory and the next attempt retries saving
  it before any provider call. Do not restart during this failure: persistence
  cannot be guaranteed when the disk is unavailable or the process crashes.
- A corrupt result store disables verification, preserves the file, and reports
  the problem without preventing the portfolio from loading.
- The shell renders before loading verification results. Client requests have
  deadlines; after errors, saved results are reconciled (including partial batches).
  Refocusing a tab reloads results without contacting Reoon or spending credits.
- Safe results older than 30 days no longer count toward green verification ticks.
  Expired results remain visible. A labelled, explicit recheck can spend a credit;
  normal viewing/retries reuse the cache. Fresh results cannot be force-refreshed.

Run reliability and regression tests with:
`node --test platform-shell/server/*.test.mjs modules/investors-jv/tests/*.test.mjs modules/wind-projects/tests/*.test.mjs`
