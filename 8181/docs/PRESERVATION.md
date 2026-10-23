# Preserving the approved 8181 behaviour

The authoritative app is this physical `8181` directory, started with `npm start`.
Do not replace it with a legacy app, reset records, disable Reoon preflight or
silently revert project-picker, typography or offer-history changes.

## Persistent storage

- Reoon results: `platform-shell/data/reoon-results.json`.
- Per-module send and project-offer histories: `platform-shell/data/pulse-sends/`.
- Project selection, current/previous drafts and offer links: browser localStorage.
  Reloads preserve them, but clearing browser storage does not. `localhost:8181`
  and `127.0.0.1:8181` are separate browser origins; use `http://localhost:8181`
  consistently. Different browser profiles have separate state.
- A file checkpoint does not back up browser localStorage or server credentials.

## Checkpoints and change detection

Run `npm run checkpoint` to create an exclusive dated copy with SHA-256 hashes
under `backups/preserved-.../`. Includes application source and runtime records;
excludes credentials, dependencies and older backups. Backups contain private
contact/history data: keep them private.

Run `npm run checkpoint:verify -- "ABSOLUTE_CHECKPOINT_FOLDER"` to compare the
live files and saved copy against the manifest. The command reports changed,
missing, new and damaged files; it never restores or overwrites live records.
New sends or verification results legitimately change runtime hashes. Inspect
the listed differences before deciding whether a change is expected.

Run `npm run test:preservation` and the existing full regression suite before
accepting changes. Do not restore old runtime data over newer sends. Any recovery
must explicitly choose source files separately from operational history.

No background monitor or automatic rollback is installed.
