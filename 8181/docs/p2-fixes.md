# Findings 3–11

- Refinery contacts use exact normalized site names, explicit naming aliases and
  separately identifiable group-wide routes. Alias reconciliation does not assert
  current ownership or supply availability. Source files and existing record IDs
  remain unchanged. The already-loaded EN590 snapshot is not reattached a second
  time by generic hydration.
- Duplicate contact enrichment unions route/phone/source arrays, retains conflicting
  field values in `fieldHistory`, and keeps distinct company, asset and primary-email
  associations separate. Repeated enrichment is idempotent; raw inputs are unchanged.
- Pulse only records a sent result when the remote response explicitly says
  `sent: true`. Unreadable/absent confirmation is labelled unconfirmed and never
  produces a positive sent indicator. Completion/error feedback is scoped to the
  originating record, even when the user navigates away during a send.
- Portfolio transitions clear the selected detail and update `#portfolio`, making
  refresh/back navigation reflect the page shown.
- NDA risk checks and quotations are selected from the currently displayed
  Original/Proposed version. Markup uses Proposed with a visible label. Historical
  saved evidence is not overwritten by this selection. The available Viktoriia
  fixture and PDF worker use absolute mapped URLs; the missing INERATEC fixture is
  no longer advertised in the module picker.
- Corrupt local Reoon registration storage is left untouched. The server still
  starts and existing sourced routes remain usable, but new registrations return
  503 until an operator restores the file. The status response and UI expose this
  degraded state rather than replacing the corrupt evidence with an empty store.
- Local Host/origin checks run before every HTTP route, including datasets, NDA
  files and outreach history; the actual listening port is respected in tests.

Regression tests use mock services, temporary fixture files and existing source
snapshots. They must not send real email or consume verification credits.
