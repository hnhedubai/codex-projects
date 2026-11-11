# Investors & JV — Contact Control Room

Open **Investors & JV → Contact Control Room** in the left sidebar, or `/investors-jv#contact-room`.

## What it shows

Every company and every recorded person/email route, including contacts without a published email. Multiple email routes are separate rows, explicitly marked when shared. Companies without contacts remain visible as research gaps. Intent values come from existing research fields and priority assessments; this page does not generate or rerun JEV votes or infer an open mandate.

Search, origin-country, sector, priority, LinkedIn, verification and route filters have their own persistent preference key (`investor-contact-room:preferences:v1`). Portfolio column order, widths, visibility and filters are not changed. Company and outreach links, contact-source links and copy-email actions support one-click navigation. Priority rows retain very light yellow highlighting. Returning from company details restores directory scroll position. On narrow screens this page uses the full width.

### Flexible column layout

Drag a header to change its position; drag its right edge to resize it. Column widths and order persist under `investor-contact-room:columns:v1`, independently of filters and portfolio settings. Saved layouts use stable field IDs, so future columns append without resetting the existing order. A dedicated horizontal scrollbar remains below the rows while the table scrolls vertically. Multi-line wrapping and the original supporting information are retained, with full cell details on hover.

Keyboard alternatives: focus a column header and press Alt+Left/Right to reorder; focus its resize separator and use Left/Right to change width (Shift changes by forty pixels). Double-click an edge to reset just that column's width. Live data refreshes do not reset the layout or replace headers during a drag.

## Live updates and scope

The page polls the read-only same-origin `/api/investors-jv/contact-directory` endpoint every five seconds while visible, and refreshes on focus. Reoon events and browser storage events update the view too. Source companies and contacts are read from the existing module; browser-local `contactsAdded` and sector overrides are merged at display time. Those manual additions remain browser-local, as before: this feature does not turn them into a shared multi-user database.

The endpoint detects research-source content changes and reloads the complete ESM graph in a short-lived worker, avoiding stale imported helper modules. It caches unchanged research. Saved public Reoon results are read on every request. A failed refresh keeps the last successful rows and displays a stale/retry warning. No periodic email verification, paid research or real sends are performed.

Green ticks require a Reoon Power result, positive `deliverable === true`, `safe` or `role_account`, and a valid non-future check no older than thirty days. Candidate/guessed/historical routes do not get a tick. Shared accounts are labelled; catch-all results retain their consent-needed status. Verification of mailbox deliverability does not prove identity, delivery, role, consent or investment appetite. Existing Pulse and local send gates are unchanged.

## Tests and rollback

Run `node --test modules/investors-jv/tests/contact-room.test.mjs platform-shell/server/investor-contact-directory.test.mjs platform-shell/shared/js/navigation.test.mjs`.

Verified 25 October 2026: 64 focused tests passed, including Pulse, Reoon, EN590 checklist and navigation regressions. The wider existing suite still has eight pre-existing failures: seven old company-count expectations and one missing export in an old rollback fixture. Browser checks covered combined filters, persistence after reload, company/contact navigation and preservation of the existing portfolio filter.

Pre-feature checkpoint: `backups/preserved-2026-10-25T07-55-12-791Z-9ba36b09/`. Restore only the three modified existing files (`server.mjs`, shared `navigation.js`, shared `shell.js`) from that checkpoint, and remove the seven feature files if reverting. Compare against later user changes first; never restore contact data or browser preferences wholesale.

Suggested next enhancement: connect the displayed last-sent/follow-up information to authoritative Pulse history with per-person next-action tracking. Current last-sent and follow-up values are shown only when already recorded in the local company workflow; their absence does not mean no email was sent.
