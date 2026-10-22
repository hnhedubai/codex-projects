# Shared portfolio navigation

`PlatformNavigation` owns the browser URL and the lifetime of one shared shell.
All seven portfolio modules use the same controller. NDA Guard remains a separate
document application: entering it deliberately performs a document navigation.

- The root shell, header and main element stay mounted between module changes.
- The selected module is loaded before committing the route. Failed loads keep the
  previous workspace usable and expose Retry; stale requests cannot win a race.
- Module records and contacts are cached in memory after successful loading. A
  refresh reads the source datasets again; no source files are rewritten.
- Within one record, only the tab panel is replaced. Tab keys, Back/Forward,
  portfolio and view-mode changes all use the same route owner.
- Module filters, view mode, pagination and scroll are retained. Portfolio does
  not clear country/search filters. Filter edits reset pagination to page one.
- Pending fields are saved separately from confirmed workflow data under
  `oplatform-navigation-drafts-v1:*`, scoped to module/record/tab. Explicit Save
  clears only the corresponding pending fields. No pending contact is verified
  or added to the actual contacts registry until Save contact is clicked.
- A one-time browser-local recovery snapshot is stored under
  `oplatform-navigation-backup:before-shared-navigation-v1` before activation.
  This covers that browser origin/profile only, not other profiles or NDA IndexedDB.
- Storage errors keep pending edits in memory and enable a leave-page warning.
- Module controllers detach their listeners on switching. Late Pulse responses
  cannot update the new module, even if record IDs happen to match.
- Historical contact metadata remains visible but cannot become a selectable
  outreach recipient. Module-specific default drafts never replace saved drafts.

The initial code/data backup is in Downloads/8181-backups. It includes private
local configuration and must not be shared publicly.

## Verification

`platform-shell/shared/js/navigation.test.mjs` uses network-free fixtures for
route consistency, pending edits, races, failures, templates and mounted panels.
The existing Reoon/Pulse/import/data tests remain applicable. Tests must never
send real emails or invoke paid verification providers.
