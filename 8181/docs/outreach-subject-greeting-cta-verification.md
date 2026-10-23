# Outreach draft V2 — verification and examples

23 October 2026, Dubai. All example people are fictional. No actual contact data or secrets are included. No email was sent.

## Settings

- OUTREACH_DRAFT_V2 = true. False restores the backed-up generator, controls, disclosure policy and legacy recipient personalization.
- OUTREACH_SUBJECT_ANONYMITY = balanced; alternative: strict.
- Balanced: coarse size/stage and broad region. Strict: technology only, in both subject and body.
- The task omitted the definition of its second level and its referenced selection table; this report makes the interpretation explicit.
- Pre-construction means advanced development; it does not substantiate a permitting-stage claim.
- Existing draft text, previous versions and workflow history are not migrated. Old banded drafts still load unchanged but require editing before copying/sending under V2.

## Backup and implementation

Backup: C:/Users/mohdz/codex-projects/8181/backups/outreach-subject-greeting-cta-20261023-1130/ — hash-verified mirrored code copies and REVERT.md.

Implementation: modules/investors-jv/outreach-draft-v2.js, project-picker-drafts.js, project-picker.js, outreach-policy.js, outreach-settings.js; platform-shell/shared/js/pulse-send-panel.js; platform-shell/server/pulse/send-request.mjs and send-service.mjs; server.mjs. The pre-V2 greeting rules remain unchanged for rollback.

## Subject matrix

Each entry shows the two variants at both levels. Subjects never use a project count, capacity total, numeric capacity band, project name, owner, country or site.

### Empty selection / Solar PV and Wind

- balanced:
  - Variant 1: Quick check on your renewable investment criteria (49 characters)
  - Variant 2: Wind and solar investment — open to a discussion? (49 characters)
- strict:
  - Variant 1: Quick check on your renewable investment criteria (49 characters)
  - Variant 2: Wind and solar investment — open to a discussion? (49 characters)

### Empty selection / Wind

- balanced:
  - Variant 1: Quick check on your wind investment criteria (44 characters)
  - Variant 2: Wind investment — open to a discussion? (39 characters)
- strict:
  - Variant 1: Quick check on your wind investment criteria (44 characters)
  - Variant 2: Wind investment — open to a discussion? (39 characters)

### Empty selection / Solar PV

- balanced:
  - Variant 1: Quick check on your solar investment criteria (45 characters)
  - Variant 2: Solar investment — open to a discussion? (40 characters)
- strict:
  - Variant 1: Quick check on your solar investment criteria (45 characters)
  - Variant 2: Solar investment — open to a discussion? (40 characters)

### Solar PV / Development / mid-size / singular

- balanced:
  - Variant 1: Mid-size solar project · development · Southern Europe (54 characters)
  - Variant 2: Mid-size solar project · development — a fit? (45 characters)
- strict:
  - Variant 1: Solar project — investment opportunity (38 characters)
  - Variant 2: Solar project — fit with your current priorities? (49 characters)

### Solar PV / Development / mid-size / plural

- balanced:
  - Variant 1: Mid-size solar projects · development · Southern Europe (55 characters)
  - Variant 2: Mid-size solar projects · development — a fit? (46 characters)
- strict:
  - Variant 1: Solar projects — investment opportunity (39 characters)
  - Variant 2: Solar projects — fit with your current priorities? (50 characters)

### Solar PV / Development / large-scale / singular

- balanced:
  - Variant 1: Large-scale solar project · development · Southern Europe (57 characters)
  - Variant 2: Large-scale solar project · development — a fit? (48 characters)
- strict:
  - Variant 1: Solar project — investment opportunity (38 characters)
  - Variant 2: Solar project — fit with your current priorities? (49 characters)

### Solar PV / Development / large-scale / plural

- balanced:
  - Variant 1: Large-scale solar projects · development · Southern Europe (58 characters)
  - Variant 2: Large-scale solar projects · development — a fit? (49 characters)
- strict:
  - Variant 1: Solar projects — investment opportunity (39 characters)
  - Variant 2: Solar projects — fit with your current priorities? (50 characters)

### Solar PV / Pre-construction / mid-size / singular

- balanced:
  - Variant 1: Mid-size solar project · advanced development (45 characters)
  - Variant 2: Mid-size solar project · advanced development — a fit? (54 characters)
- strict:
  - Variant 1: Solar project — investment opportunity (38 characters)
  - Variant 2: Solar project — fit with your current priorities? (49 characters)

### Solar PV / Pre-construction / mid-size / plural

- balanced:
  - Variant 1: Mid-size solar projects · advanced development (46 characters)
  - Variant 2: Mid-size solar projects · advanced development — a fit? (55 characters)
- strict:
  - Variant 1: Solar projects — investment opportunity (39 characters)
  - Variant 2: Solar projects — fit with your current priorities? (50 characters)

### Solar PV / Pre-construction / large-scale / singular

- balanced:
  - Variant 1: Large-scale solar project · advanced development (48 characters)
  - Variant 2: Large-scale solar project · advanced development — a fit? (57 characters)
- strict:
  - Variant 1: Solar project — investment opportunity (38 characters)
  - Variant 2: Solar project — fit with your current priorities? (49 characters)

### Solar PV / Pre-construction / large-scale / plural

- balanced:
  - Variant 1: Large-scale solar projects · advanced development (49 characters)
  - Variant 2: Large-scale solar projects · advanced development — a fit? (58 characters)
- strict:
  - Variant 1: Solar projects — investment opportunity (39 characters)
  - Variant 2: Solar projects — fit with your current priorities? (50 characters)

### Solar PV / Ready-to-build / mid-size / singular

- balanced:
  - Variant 1: Mid-size solar project · ready-to-build · Southern Europe (57 characters)
  - Variant 2: Mid-size solar project · ready-to-build — a fit? (48 characters)
- strict:
  - Variant 1: Solar project — investment opportunity (38 characters)
  - Variant 2: Solar project — fit with your current priorities? (49 characters)

### Solar PV / Ready-to-build / mid-size / plural

- balanced:
  - Variant 1: Mid-size solar projects · ready-to-build · Southern Europe (58 characters)
  - Variant 2: Mid-size solar projects · ready-to-build — a fit? (49 characters)
- strict:
  - Variant 1: Solar projects — investment opportunity (39 characters)
  - Variant 2: Solar projects — fit with your current priorities? (50 characters)

### Solar PV / Ready-to-build / large-scale / singular

- balanced:
  - Variant 1: Large-scale solar project · ready-to-build · Southern Europe (60 characters)
  - Variant 2: Large-scale solar project · ready-to-build — a fit? (51 characters)
- strict:
  - Variant 1: Solar project — investment opportunity (38 characters)
  - Variant 2: Solar project — fit with your current priorities? (49 characters)

### Solar PV / Ready-to-build / large-scale / plural

- balanced:
  - Variant 1: Large-scale solar projects · ready-to-build (43 characters)
  - Variant 2: Large-scale solar projects · ready-to-build — a fit? (52 characters)
- strict:
  - Variant 1: Solar projects — investment opportunity (39 characters)
  - Variant 2: Solar projects — fit with your current priorities? (50 characters)

### Onshore wind / Development / mid-size / singular

- balanced:
  - Variant 1: Mid-size wind project · development · Southern Europe (53 characters)
  - Variant 2: Mid-size wind project · development — a fit? (44 characters)
- strict:
  - Variant 1: Wind project — investment opportunity (37 characters)
  - Variant 2: Wind project — fit with your current priorities? (48 characters)

### Onshore wind / Development / mid-size / plural

- balanced:
  - Variant 1: Mid-size wind projects · development · Southern Europe (54 characters)
  - Variant 2: Mid-size wind projects · development — a fit? (45 characters)
- strict:
  - Variant 1: Wind projects — investment opportunity (38 characters)
  - Variant 2: Wind projects — fit with your current priorities? (49 characters)

### Onshore wind / Development / large-scale / singular

- balanced:
  - Variant 1: Large-scale wind project · development · Southern Europe (56 characters)
  - Variant 2: Large-scale wind project · development — a fit? (47 characters)
- strict:
  - Variant 1: Wind project — investment opportunity (37 characters)
  - Variant 2: Wind project — fit with your current priorities? (48 characters)

### Onshore wind / Development / large-scale / plural

- balanced:
  - Variant 1: Large-scale wind projects · development · Southern Europe (57 characters)
  - Variant 2: Large-scale wind projects · development — a fit? (48 characters)
- strict:
  - Variant 1: Wind projects — investment opportunity (38 characters)
  - Variant 2: Wind projects — fit with your current priorities? (49 characters)

### Onshore wind / Pre-construction / mid-size / singular

- balanced:
  - Variant 1: Mid-size wind project · advanced development (44 characters)
  - Variant 2: Mid-size wind project · advanced development — a fit? (53 characters)
- strict:
  - Variant 1: Wind project — investment opportunity (37 characters)
  - Variant 2: Wind project — fit with your current priorities? (48 characters)

### Onshore wind / Pre-construction / mid-size / plural

- balanced:
  - Variant 1: Mid-size wind projects · advanced development (45 characters)
  - Variant 2: Mid-size wind projects · advanced development — a fit? (54 characters)
- strict:
  - Variant 1: Wind projects — investment opportunity (38 characters)
  - Variant 2: Wind projects — fit with your current priorities? (49 characters)

### Onshore wind / Pre-construction / large-scale / singular

- balanced:
  - Variant 1: Large-scale wind project · advanced development (47 characters)
  - Variant 2: Large-scale wind project · advanced development — a fit? (56 characters)
- strict:
  - Variant 1: Wind project — investment opportunity (37 characters)
  - Variant 2: Wind project — fit with your current priorities? (48 characters)

### Onshore wind / Pre-construction / large-scale / plural

- balanced:
  - Variant 1: Large-scale wind projects · advanced development (48 characters)
  - Variant 2: Large-scale wind projects · advanced development — a fit? (57 characters)
- strict:
  - Variant 1: Wind projects — investment opportunity (38 characters)
  - Variant 2: Wind projects — fit with your current priorities? (49 characters)

### Onshore wind / Ready-to-build / mid-size / singular

- balanced:
  - Variant 1: Mid-size wind project · ready-to-build · Southern Europe (56 characters)
  - Variant 2: Mid-size wind project · ready-to-build — a fit? (47 characters)
- strict:
  - Variant 1: Wind project — investment opportunity (37 characters)
  - Variant 2: Wind project — fit with your current priorities? (48 characters)

### Onshore wind / Ready-to-build / mid-size / plural

- balanced:
  - Variant 1: Mid-size wind projects · ready-to-build · Southern Europe (57 characters)
  - Variant 2: Mid-size wind projects · ready-to-build — a fit? (48 characters)
- strict:
  - Variant 1: Wind projects — investment opportunity (38 characters)
  - Variant 2: Wind projects — fit with your current priorities? (49 characters)

### Onshore wind / Ready-to-build / large-scale / singular

- balanced:
  - Variant 1: Large-scale wind project · ready-to-build · Southern Europe (59 characters)
  - Variant 2: Large-scale wind project · ready-to-build — a fit? (50 characters)
- strict:
  - Variant 1: Wind project — investment opportunity (37 characters)
  - Variant 2: Wind project — fit with your current priorities? (48 characters)

### Onshore wind / Ready-to-build / large-scale / plural

- balanced:
  - Variant 1: Large-scale wind projects · ready-to-build · Southern Europe (60 characters)
  - Variant 2: Large-scale wind projects · ready-to-build — a fit? (51 characters)
- strict:
  - Variant 1: Wind projects — investment opportunity (38 characters)
  - Variant 2: Wind projects — fit with your current priorities? (49 characters)

### Wind and solar, mixed stages and tiers

- balanced:
  - Variant 1: Mixed-scale wind and solar projects · mixed stages (50 characters)
  - Variant 2: Mixed-scale wind and solar projects · mixed stages — a fit? (59 characters)
- strict:
  - Variant 1: Wind and solar projects — investment opportunity (48 characters)
  - Variant 2: Wind and solar projects — fit with your current priorities? (59 characters)

### Solar, mixed stages and tiers

- balanced:
  - Variant 1: Mixed-scale solar projects · mixed stages · Southern Europe (59 characters)
  - Variant 2: Mixed-scale solar projects · mixed stages — a fit? (50 characters)
- strict:
  - Variant 1: Solar projects — investment opportunity (39 characters)
  - Variant 2: Solar projects — fit with your current priorities? (50 characters)

## Full examples

Eight full drafts: CEO, director, analyst and shared mailbox; each with one selected solar project and three selected solar projects. Exact counts here label the internal test cases only; they are absent from outgoing draft text. These examples use balanced; both levels are tested.

### Chief Executive Officer — One selected project

Fictional greeting: Dear María Álvarez, Classification: c-level. Draft words: 91.

```text
Subject: Large-scale solar project · ready-to-build · Southern Europe

Dear María Álvarez,

I am an independent introducer working with project owners on a solar PV opportunity.

- Solar PV project: large-scale; ready-to-build; Southern Europe.

I wanted to ask whether this fits your current development and investment criteria.

Project identity, ownership and documents are shared only under an NDA and with the owner's permission.

Would a 20-minute call next week be possible? If helpful, I can send a one-page anonymous summary beforehand.
A one-line reply, interested or not, is enough.

Kind regards,
```

### Chief Executive Officer — Three selected projects

Fictional greeting: Dear María Álvarez, Classification: c-level. Draft words: 90.

```text
Subject: Mixed-scale solar projects · ready-to-build

Dear María Álvarez,

I am an independent introducer working with project owners on selected solar PV opportunities.

- Solar PV projects: mixed-scale; ready-to-build; Southern Europe.

I wanted to ask whether any of them fit your current development and investment criteria.

Project identity, ownership and documents are shared only under an NDA and with the owner's permission.

Would a 20-minute call next week be possible? If helpful, I can send a one-page anonymous summary beforehand.
A one-line reply, interested or not, is enough.

Kind regards,
```

### Investment Director — One selected project

Fictional greeting: Dear André, Classification: director. Draft words: 106.

```text
Subject: Large-scale solar project · ready-to-build · Southern Europe

Dear André,

I am an independent introducer working with project owners on a solar PV opportunity.

- Solar PV project: large-scale; ready-to-build; Southern Europe.

I wanted to ask whether this fits your current development and investment criteria.

Project identity, ownership and documents are shared only under an NDA and with the owner's permission.

Could we arrange a 20-minute call in the next two weeks? If you are not the right person, I would be grateful if you could pass this to the colleague who covers solar acquisitions.
A one-line reply, interested or not, is enough.

Kind regards,
```

### Investment Director — Three selected projects

Fictional greeting: Dear André, Classification: director. Draft words: 105.

```text
Subject: Mixed-scale solar projects · ready-to-build

Dear André,

I am an independent introducer working with project owners on selected solar PV opportunities.

- Solar PV projects: mixed-scale; ready-to-build; Southern Europe.

I wanted to ask whether any of them fit your current development and investment criteria.

Project identity, ownership and documents are shared only under an NDA and with the owner's permission.

Could we arrange a 20-minute call in the next two weeks? If you are not the right person, I would be grateful if you could pass this to the colleague who covers solar acquisitions.
A one-line reply, interested or not, is enough.

Kind regards,
```

### Investment Analyst — One selected project

Fictional greeting: Hello Sofía, Classification: other. Draft words: 106.

```text
Subject: Large-scale solar project · ready-to-build · Southern Europe

Hello Sofía,

I am an independent introducer working with project owners on a solar PV opportunity.

- Solar PV project: large-scale; ready-to-build; Southern Europe.

I wanted to ask whether this fits your current development and investment criteria.

Project identity, ownership and documents are shared only under an NDA and with the owner's permission.

Could we arrange a 20-minute call in the next two weeks? If you are not the right person, I would be grateful if you could pass this to the colleague who covers solar acquisitions.
A one-line reply, interested or not, is enough.

Kind regards,
```

### Investment Analyst — Three selected projects

Fictional greeting: Hello Sofía, Classification: other. Draft words: 105.

```text
Subject: Mixed-scale solar projects · ready-to-build

Hello Sofía,

I am an independent introducer working with project owners on selected solar PV opportunities.

- Solar PV projects: mixed-scale; ready-to-build; Southern Europe.

I wanted to ask whether any of them fit your current development and investment criteria.

Project identity, ownership and documents are shared only under an NDA and with the owner's permission.

Could we arrange a 20-minute call in the next two weeks? If you are not the right person, I would be grateful if you could pass this to the colleague who covers solar acquisitions.
A one-line reply, interested or not, is enough.

Kind regards,
```

### Shared mailbox — One selected project

Fictional greeting: Hello, Classification: shared. Draft words: 83.

```text
Subject: Large-scale solar project · ready-to-build · Southern Europe

Hello,

I am an independent introducer working with project owners on a solar PV opportunity.

- Solar PV project: large-scale; ready-to-build; Southern Europe.

I wanted to ask whether this fits your current development and investment criteria.

Project identity, ownership and documents are shared only under an NDA and with the owner's permission.

Could you please forward this to the person responsible for solar acquisitions?
A one-line reply, interested or not, is enough.

Kind regards,
```

### Shared mailbox — Three selected projects

Fictional greeting: Hello, Classification: shared. Draft words: 82.

```text
Subject: Mixed-scale solar projects · ready-to-build

Hello,

I am an independent introducer working with project owners on selected solar PV opportunities.

- Solar PV projects: mixed-scale; ready-to-build; Southern Europe.

I wanted to ask whether any of them fit your current development and investment criteria.

Project identity, ownership and documents are shared only under an NDA and with the owner's permission.

Could you please forward this to the person responsible for solar acquisitions?
A one-line reply, interested or not, is enough.

Kind regards,
```

## Verification

- Every non-empty subset of six projects, four recipient classes, three message variants and both levels: 1,512 full-draft privacy/length checks.
- Subject matrix tests also cover every stored stage, every allowed MW band and singular/plural selections.
- Rollback compares full draft objects, picker markup, disclosure outcomes, personalized payloads and exact idempotency keys against the named backup.
- The server rejects identifying subjects/body text and overlong personalized V2 messages before any history/provider operation.
- Subject-only edits preserve the body, previous version, selected projects and offer linkage; failed storage leaves the editor unchanged.
- Browser checked: empty-selection subjects, both subject choices, CEO full-name greeting/CTA, plural count-free summaries, unchanged saved editor and controls.
- The chat handoff gives the final test count.

## Preserved safeguards

No project source data or contacts were changed. The original banded data remains intact. Reoon and Pulse gates, anonymity, checklist, ten-recipient limit, single-send lock, signatures, workflow and send history remain in force. Changed content produces a new content-based idempotency key; unchanged content and recipient metadata are deterministic.

