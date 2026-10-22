# Opportunity Platform Plan

## Purpose

Build a shared research and outreach platform for multiple commercial workspaces while preserving clear separation between each workspace's data, terminology and research logic.

## Current baseline

- Existing Wind Projects app: `http://localhost:9601/wind-projects`
- Existing source: `C:\Users\mohdz\codex-projects\apps\wind-projects`
- New platform root: `C:\Users\mohdz\codex-projects\8181`
- New development server: `http://localhost:8181`
- The existing Wind Projects app remains the protected visual and functional reference.

## Target workspaces

1. Wind Projects
2. Investors & JV
3. Hydrogen Offtakers
4. e-SAF
5. Ammonia
6. Other gaseous products
7. Diesel EN590

## Architecture

```text
8181/
  server.mjs
  platform-shell/
    shared/
    apps/
    data/
  modules/
    wind-projects/
    investors-jv/
    hydrogen-offtakers/
    e-saf/
    ammonia/
    other-gases/
    diesel-en590/
    nda-guard/
  docs/
    platform-plan.md
```

The shared layer owns appearance and reusable behavior. Each workspace owns its data, filters, terminology, tabs, research skill and domain-specific fields.

### Repository boundaries (required)

Port 8181 is an independent platform and must not depend on the port 9601
application at runtime. The 9601 Wind Projects repository is reference-only and
must remain untouched.

The 8181 platform will use one shared shell repository and one repository per
module:

```text
C:\Users\mohdz\codex-projects\8181\
  platform-shell\       # shared shell, CSS, JavaScript and infrastructure
  modules\
    wind-projects\      # independent 8181 module repository
    investors-jv\       # independent 8181 module repository
    hydrogen-offtakers\ # independent 8181 module repository
    e-saf\              # independent 8181 module repository
    ammonia\            # independent 8181 module repository
    other-gases\        # independent 8181 module repository
    diesel-en590\       # independent 8181 module repository
    nda-guard\          # independent 8181 module repository
```

Each module repository owns its records, source snapshots, detail pages, tabs,
domain filters and module-specific behavior. The platform-shell repository owns
only reusable infrastructure. Shared infrastructure must be consumed through a
versioned local package or explicit shared dependency; modules must not import
from `C:\Users\mohdz\codex-projects\apps\wind-projects`.

The split is represented physically under `C:\Users\mohdz\codex-projects\8181`;
the parent is the platform workspace and each listed child is an independent
repository boundary. The 8181 application must not import from 9601.

## Shared design infrastructure

- Master design tokens: colour, typography, spacing, borders, radii and shadows.
- Common application shell, left sidebar, breadcrumb and workspace navigation.
- Shared filters, tables, horizontal and vertical scrolling, pagination and resizable columns.
- Shared starring, ordering, drag-and-drop and status indicators.
- Shared detail-page tabs and card primitives.
- Shared export/import and local persistence patterns.
- Shared responsive and accessibility behavior.

## Non-negotiable visual baseline: 100% Wind Projects parity

Port 9601 Wind Projects is the canonical reference. A workspace is not complete
when it merely uses similar colours or a similar card style. It must use the
same CSS rules, spacing system, typography, control treatment, scrollport
behaviour and responsive breakpoints as Wind Projects.

Canonical source:

```text
C:\Users\mohdz\codex-projects\apps\wind-projects\dist\styles.css
```

Shared copy used by the new platform:

```text
C:\Users\mohdz\codex-projects\8181\shared\css\wind-reference.css
```

The reference stylesheet is the source of truth. New workspace CSS may add
domain fields or content, but may not replace the reference design with a new
visual system. Any override must be documented, tested against 9601 and be
necessary for a domain-specific control.

Parity includes:

- Inter / Segoe UI typography, weights, sizes, line heights and letter spacing.
- Wind colour tokens, borders, radii, shadows, muted text, status pills and action colours.
- The 282px left sidebar, sticky full-height sidebar, brand block, portfolio button, library filters and footer.
- Topbar height, breadcrumb spacing, export/import controls and responsive wrapping.
- Main content width, padding, headings, notices, cards, two-column grids and form controls.
- Table density, alternating rows, hover state, sticky header, resize handles, ellipsis and column-width persistence.
- Bounded vertical and horizontal scrollbars, scrollbar corner, scroll-gutter and viewport overflow rules.
- Portfolio view, partner table view, detail view, tabs, contact cards, evidence cards and outreach controls.
- Mobile and print breakpoints already defined in the reference stylesheet.

The acceptance test is visual comparison at the same viewport sizes used for
9601. A task remains incomplete if any workspace introduces different padding,
font scale, table row height, sidebar width, scrollbar behaviour, tab treatment
or control styling without an approved exception.

## Complete shared page structure

Every record-based workspace must contain the same structural layers:

1. App shell: fixed/sticky leftbar and flexible content area.
2. Brand block: workspace symbol, workspace name and descriptor.
3. Workspace switcher: Wind Projects, Investors & JV, Hydrogen Offtakers, e-SAF, Ammonia, Other Gases and Diesel EN590.
4. Portfolio overview control with the current filtered count.
5. Library controls: search, country filter, signal/domain filter, include/exclude country mode where applicable.
6. Scrollable leftbar library with drag handle, star, verification/status indicators and active-row state.
7. Topbar breadcrumb with workspace and record context, Export workspace and Import notes.
8. Portfolio view controls placed in the topbar, outside the main table scrollport: Table and Kanban.
9. Table view with sticky headers, resizable columns, horizontal scrolling, vertical scrolling, pagination and review/open action.
10. Kanban view using the same records, filters, counts and status definitions as Table view.
11. Record detail page with the full shared tab set below.

## Complete record-detail tab contract

The following tabs must exist in the same order and use the same Wind Projects
layout on every workspace. Only labels and domain fields may change.

### Overview

- Record identity, geography, company/developer/owner and headline scale.
- Current status, partnership/offtake/investment signal and latest evidence date.
- Research completeness, evidence level and recommended next step.
- Source-backed summary and clear unresolved items.
- Deep-research request/status panel scoped to Overview only.

### Project & Status

- Development stage, permitting, land/site, grid/interconnection and construction status.
- Capacity, technology, timeline, COD/FID/RTB milestones and status dates.
- Status history with source, date and confidence.
- Separate confirmed facts, reported claims and unresolved questions.

### Partnership

- Partner/investor/offtaker availability and relationship status.
- Intent type: investment, JV, acquisition, co-development, offtake, EPC, technology or strategic partnership.
- Preferred scale, geography, ownership/transaction route, mandate status and latest intent evidence.
- Existing partners and whether a new external partner window is confirmed, unconfirmed, historical or closed.

### Financials

- Reported capex, funding requirement, equity/debt structure, valuation or stake only when sourced.
- Revenue/PPA/offtake economics, grants, financing milestones and financial assumptions.
- Currency, units, date, source URL and confidence for every figure.
- Never infer unpublished terms or convert an intermediary claim into a confirmed offer.

### Due Diligence

- Ownership and authority to represent the record.
- Land, permits, grid, resource study, environmental approvals and legal entity.
- Commercial route, offtake/PPA, financing, technology, construction and schedule questions.
- Checklist status: unanswered, in review, answered, source-backed or blocked.

### Evidence

- Evidence register with title, source URL, publication date, captured date, notes and confidence.
- Add/edit/delete evidence without overwriting the original imported record.
- Evidence must identify whether it is official, regulatory, company, intermediary, marketplace, media or user-provided.
- Evidence updates must route to the relevant record and remain visible in History.

### History

- Immutable chronological record of imports, edits, research runs, approvals, contact changes, verification and outreach.
- Preserve before/after values, actor, timestamp, source and reason where available.
- Never silently replace a prior value that is needed for relationship or diligence history.

### Contacts

- Contact cards with initials/avatar, name, designation, role, company, LinkedIn profile, email(s), phone(s), source and notes.
- Support company, business, personal and generic route emails without presenting them as the same identity.
- Reoon status must distinguish verified, unsafe, unknown and not checked.
- Contact-source links and person-email association confidence are mandatory.
- Edit, copy, delete and provider-history controls must match Wind Projects.

### Research & Sources

- Research provider record, query/scope, date, model/tool, sources and raw result reference.
- Provider gates may include ChatGPT, Exa and Firecrawl, but every result remains reviewable before data mutation.
- Deep research is on demand and scoped to the selected tab or record.
- Accepted changes must identify exactly which tab and fields they update.

### Outreach

- Workspace-specific draft with subject, body, placeholders and personalized greeting mechanism.
- Recipient selection one by one, with unticked unresolved recipients remaining visible.
- Pulse mailbox connection, send confirmation, sent/failed/response-received status and history.
- Follow-up date, relationship stage, email status, conversation notes and save workflow controls.
- Outreach must use the record's own contacts and evidence; no hard-coded company or project text.

## Workspace section and field matrix

All workspaces share the shell and ten tabs above. Their table fields and
domain vocabulary are separated as follows:

| Workspace | Primary record | Required table fields | Primary signal/status |
|---|---|---|---|
| Wind Projects | Project | Project, Developer, Country, Reported scale, Partnership signal, Opportunity status, Your workflow, Review | Investor sought, partner sought, procurement, sponsor invitation, watchlist, validation required |
| Investors & JV | Partner | Partner, Country, Investment/JV intent, Preferred scale, Latest evidence, Status, Your workflow, Review | Open, engaged, potential fit, historical, closed/unconfirmed |
| Hydrogen Offtakers | Company/site | Company, Industry, Country/zone, Demand signal, Offtake status, Latest evidence, Your workflow, Review | Hydrogen fuel switch/process heat, existing use, trial, fossil replacement, EU ETS/process heat |
| e-SAF | Company/project | Company, Industry, Country, e-SAF demand signal, Opportunity status, Latest evidence, Your workflow, Review | Buyer, producer, technology, feedstock, offtake or partnership route |
| Ammonia | Company/project | Company, Industry, Country, ammonia signal, Opportunity status, Latest evidence, Your workflow, Review | Existing ammonia use, new demand, import/export, production or partnership |
| Other Gases | Company/project | Company, Industry, Country, gas/product signal, Opportunity status, Latest evidence, Your workflow, Review | Product-specific demand and partnership signals |
| Diesel EN590 | Buyer | Buyer, Country, Product/grade, Demand signal, Tender status, Latest evidence, Your workflow, Review | Open RFQ, tender, buyer lead, rejected or historical |

## Shared interaction requirements

- A country filter must work consistently in the leftbar and pipeline. Selecting a country includes it; selecting an exclusion checkbox excludes it. Moving between a country, All and another country must recompute both rows and counts from the same source set.
- One signal filter definition must drive both the leftbar and pipeline. No duplicate signal taxonomies may exist.
- Counts must be calculated after every search, country, signal, sector, exclusion, pagination and view change.
- Starred records move to the top of the leftbar while preserving manual drag-and-drop order for the remaining records.
- Drag-and-drop must use the same order store in both Table and Kanban views and remain stable after refresh.
- Green/grey verification indicators must be data-derived. No hard-coded circles or status marks may be used.
- Gear/column controls must always be visible in table headers and must preserve widths, order and visibility locally.
- Table pagination, page size, vertical scrolling and horizontal scrolling must match Wind Projects.
- Opening a record from any workspace must remain within that workspace route; portfolio links must not silently switch to Wind Projects.

## Data migration and no-loss rules

- Preserve the original Wind Projects and partner source modules unchanged.
- Keep a raw imported snapshot and a normalized table view model; never use the table view model as the sole copy of a record.
- Preserve all contacts, source URLs, evidence, notes, statuses, verification results, outreach history, research runs and workflow values.
- Keep duplicate records when they represent different source records; deduplicate only with an auditable identity rule.
- Record import date, source path, source hash and imported count for every workspace.
- Data migration is additive and reversible. Never delete or overwrite the port 9601 source while 8181 is under development.

## 100% completion gate

The platform is accepted only when all of the following are true:

- Every workspace has the complete shell, leftbar, table/Kanban controls and ten tabs.
- The new platform uses the Wind Projects stylesheet and matches 9601 at desktop, compact desktop, mobile and print breakpoints.
- Table headers, row density, column resizing, gear controls, pagination and both scrollbars behave like 9601.
- All filters use one shared source of truth and counts remain correct when switching back and forth.
- Star, green/grey verification, drag-and-drop and workspace-local navigation work in every workspace.
- Contacts, Reoon verification, Pulse outreach and provider history work through shared infrastructure while data remains workspace-specific.
- Imported counts reconcile against source snapshots and every raw record remains recoverable.
- Visual comparison and functional regression checks are recorded before release.

Until these conditions are met, the implementation must be labelled **incomplete** rather than visually approved.

## Shared contact and outreach infrastructure

Pulse will be integrated once in the shared platform and reused by every workspace.

The shared email layer will provide:

- Pulse connection and mailbox status.
- Draft preview and personalised greetings.
- Recipient selection and send confirmation.
- Sent, failed and response-received status.
- Send history isolated by workspace and record.
- Reoon deliverability verification indicators.
- Safe handling of unresolved or unverified contacts.

Each workspace supplies its own draft, recipients, subject and personalisation fields. No workspace may read or modify another workspace's contacts without an explicit import/export action.

## Workspace routes

Planned routes:

```text
/wind-projects
/investors-jv
/hydrogen-offtakers
/e-saf
/ammonia
/gases
/diesel-en590
```

## Migration sequence

### Phase 1 — Protect the baseline

- Preserve the current Wind Projects app and data.
- Do not change port 9601 while the new platform is being built.
- Record the current Wind layout, behavior and acceptance checks.

### Phase 2 — Build the new shell on port 8181

- Create the new server and route registry.
- Implement shared tokens, shell, sidebar, breadcrumb and tabs.
- Add the common table, scrolling and pagination infrastructure.

### Phase 3 — Establish Wind as the reference workspace

- Reproduce the Wind Projects visual language on port 8181.
- Compare the new shell with port 9601.
- Do not migrate data until the layout and navigation are approved.

### Phase 4 — Add Investors & JV

- Give it its own workspace route and data store.
- Preserve the same tabs and table infrastructure.
- Keep partner-specific fields such as investment/JV intent, scale, evidence date and relationship status.

### Phase 5 — Add Hydrogen and other workspaces

- Add Hydrogen Offtakers first.
- Then add e-SAF, Ammonia, other gases and Diesel EN590.
- Reuse the shared Pulse, contacts, verification and outreach components.

## Data boundaries

- Each workspace has separate records, contacts, notes, research history and outreach history.
- Shared UI code must not create shared business data accidentally.
- Research evidence, inferred assumptions and confirmed commercial facts must remain clearly distinguished.
- Unverified contacts and email deliverability must never be presented as confirmed identity matches.

## Acceptance criteria

- All workspaces have the same approved shell and visual language.
- Sidebar, filters, starring and drag-and-drop work consistently.
- Tables support the same scrolling, resizing and pagination behavior.
- Detail tabs are aligned and behave consistently across workspaces.
- Pulse is integrated once and works from every workspace.
- Contacts, verification and outreach history remain workspace-specific.
- A change to shared CSS or JavaScript can be tested across all workspaces before release.
- The existing port 9601 remains recoverable until the new platform is accepted.

## Current status

| Area | Status | Next action |
|---|---|---|
| Existing Wind Projects | Reference baseline | Preserve and document |
| New platform folder | In progress | Add domain data and workspace modules |
| Shared design system | Foundation created | Compare against Wind and refine tokens/primitives |
| Shared Pulse integration | Planned | Define shared client and storage contract |
| Investors & JV | Embedded in Wind today | Rebuild as separate workspace |
| Hydrogen Offtakers | Existing separate app | Migrate after shell approval |
| e-SAF / Ammonia / gases / EN590 | Planned | Add after shared foundation |

## Decision log

- 2026-10-18: Use `C:\Users\mohdz\codex-projects\8181` as the new platform staging root.
- 2026-10-18: Use port 8181 for new development and keep port 9601 unchanged.
- 2026-10-18: Integrate Pulse once as shared infrastructure.
- 2026-10-18: Use Wind Projects as the visual reference, not as the permanent parent of every workspace.
- 2026-10-19: Split 8181 into a shared platform-shell repository and independent repositories for every module; 9601 remains reference-only.

## Reusable implementation architecture

The shared shell uses small, single-purpose classes rather than workspace-specific event code:

- `OpportunityPlatformApp` owns workspace bootstrapping, shell composition and view switching.
- `SidebarController` owns search, country/signal filters, starring, verification indicators and leftbar ordering.
- `PipelineView` owns the table/kanban projection and maps workspace records to the shared column contract.
- `ColumnManager` owns persisted column widths and pointer-based resizing.
- `ColumnOrderController` owns drag-to-reorder headers and persisted column order.
- `ColumnSettings` owns the always-available gear menu and column visibility state.
- `PaginationController` owns page size, page navigation and the visible range summary.

CSS is class-based and layered: Wind reference styles provide the approved visual baseline, while platform component classes provide reusable behavior hooks (`platform-page`, `leftbar-menu`, `pipeline-table-shell`, `pipeline-pagination`, `column-settings`). Data remains in workspace-specific source modules and is passed to the shared view-model layer without mutating the imported source snapshots.


