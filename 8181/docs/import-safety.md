# P1 import safeguards

Workspace imports validate the complete state before any write. Only supported
module-scoped keys, correctly typed workflows, and bounded values are accepted.
Unknown fields cause a clear rejection; they are never silently discarded.
Diligence counts must be integers from 0 to 10, and the renderer separately
normalizes already-corrupted local values so they cannot become HTML.

EN590 CSV imports preview additions, enrichments, skipped duplicates and retained
conflicts, then require confirmation. Existing imported contacts remain present.
Identity uses company, asset, name and email; different email routes remain distinct.
Matching cards retain existing primary values and store conflicting incoming values
in `importConflicts`. Additional phone/source routes are retained in their arrays.
Exact repeated imports do not duplicate contacts or conflict history. The static
module datasets are not modified by either import path.

Before committing, the app stores a recovery copy of the previous browser values
under `oplatform-import-backup:<module>:<timestamp>:<suffix>`. If this backup cannot
be saved, the import stops. If later writes fail, the app attempts to restore each
previous value and retains the recovery copy. Concurrent EN590 changes detected
after preview abort the import instead of overwriting them.

Pre-P1 rollback checkpoint (22 October 2026):
`C:\Users\mohdz\Downloads\8181-backups\8181-before-p1-20261022-162828`
contains the complete 8181 filesystem copy and a SHA-256 manifest, plus seven
workspace exports from the connected in-app browser. Other browser profiles and
NDA IndexedDB records are not included in these workspace exports. The filesystem
copy contains private local configuration: keep it local and do not share it.

These changes prevent further import loss; they do not claim to recover contacts
that had already been replaced before the checkpoint. Recovery requires comparing
older exports/backups and reviewing a merge before applying it.
