# Reoon contact-verification plan

**Status:** implemented; shared email identity deduplication and Power-mode
verification are active

## Purpose

Reoon should verify the deliverability and risk of an email address after a
contact is created or its email changes. It must not decide whether a person is
the correct decision-maker, whether a company is a qualified buyer, or whether
outreach is approved.

The tracker now has a Reoon Power-mode adapter, append-only verification
attempts, a retry/review queue, a persisted next-verification policy, and a
shared email identity layer.

## Provider output

For an immediate single-address check, use Reoon Power mode:

`GET https://emailverifier.reoon.com/api/v1/verify?email=<email>&key=<key>&mode=power`

The documented Power response includes:

- `status`: `safe`, `invalid`, `disabled`, `disposable`, `inbox_full`,
  `catch_all`, `role_account`, `spamtrap`, or `unknown`
- `overall_score` from 0 to 100
- `is_safe_to_send`
- `is_valid_syntax`, `is_disposable`, `can_connect_smtp`,
  `has_inbox_full`, `is_catch_all`, `is_deliverable`, `is_disabled`,
  `is_spamtrap`, `is_role_account`, `mx_accepts_mail`
- `email`, `username`, `domain`, `mx_records`, and `verification_mode`

Quick mode is documented as faster but does not check the individual inbox. It
must not be used when the table label is intended to mean that the mailbox was
actually checked.

## Meaning and policy

| Provider status | UI category | Default policy | Re-verify automatically? |
|---|---|---|---|
| `safe` | Safe | Keep; eligible for human-approved outreach | Yes, after 30 days |
| `role_account` | Role / valid | Keep; shared mailbox, not a personal contact | Yes, after 30 days |
| `catch_all` | Catch-all / uncertain | Keep separately; do not call safe | Yes, after 30 days |
| `inbox_full` | Inbox full | Keep temporarily; flag for review | Yes, after 7 days |
| `unknown` | Unknown | Keep unchanged; no positive deliverability claim | No automatic retry after the first controlled retry window; admin force only thereafter |
| `invalid` | Invalid | Preserve record; suppress outreach | No; admin force only |
| `disabled` | Disabled | Preserve record; suppress outreach | No; admin force only |
| `disposable` | Disposable | Preserve record; suppress outreach | No; admin force only |
| `spamtrap` | Spamtrap | Preserve record; suppress outreach and escalate | No; admin force only |
| provider error / timeout | Verification failed | Preserve prior result; show stale/error state | Retry provider error with bounded backoff, not as a monthly verification |

The monthly interval is an application policy, not a guarantee supplied by
Reoon. Reoon's own guidance treats unknown as a candidate for later checking,
while invalid, disposable, spamtrap, and disabled results are normally removed
or suppressed. The tracker should preserve these records rather than delete
them.

## Database design

Do not treat a contact row as the identity of an email address. Multiple
contacts may share one company mailbox. The database therefore keeps one
normalized email identity and links any number of contacts to it:

```text
tracker.email_identities
  id
  normalized_email unique
  current verification fields

tracker.email_identity_contacts
  email_identity_id
  contact_id
  unique contact_id
```

The existing verification jobs and attempts reference `email_identity_id`.
There is one active pending/processing job per identity, protected by both a
row lock (`FOR UPDATE`) and a partial unique index. A prior attempt is reused
regardless of its status; only an explicit admin-forced request bypasses that
reuse rule. A recorded result is mirrored to every linked contact.

The append-only history table and current-state projection are:

```text
tracker.email_verification_attempts
  id
  contact_id
  email_snapshot
  provider = 'reoon'
  mode = 'power'
  provider_status
  normalized_category
  overall_score
  is_safe_to_send
  is_valid_syntax
  is_role_account
  is_disposable
  is_catch_all
  is_deliverable
  is_disabled
  is_spamtrap
  can_connect_smtp
  has_inbox_full
  mx_accepts_mail
  mx_records jsonb
  raw_result jsonb
  checked_at
  error_code
  error_message_safe
```

The current fields are mirrored to the contact read projection for fast table
reads, while the identity row remains the source of truth for shared emails:

```text
email_verification_status
email_verification_category
email_verification_score
email_verified_at
email_next_verification_at
email_verification_stale
email_verification_forced
```

The `email_snapshot` is important: if an email changes, the new address must
be checked as a new identity and the old verification must not be reused.

## Controlled functions and views

The application should never update the base contact table directly. Use these
database routines:

1. `tracker.enqueue_contact_email_verification(contact_id, reason)`
   - locks the normalized email identity and idempotently creates one pending
     job for that identity;
   - reason is `new_contact`, `email_changed`, `monthly_due`, or
     `admin_forced`.
2. `tracker.claim_contact_email_verification(worker_id)`
   - claims one due job with a short lease;
   - prevents duplicate provider calls from concurrent workers.
3. `tracker.record_contact_email_verification(job_id, provider_result)`
   - validates and normalizes the result;
   - appends history;
   - updates the shared identity and every linked contact projection;
   - calculates the next due date;
   - records an audit event.
4. `tracker.force_contact_email_reverification(contact_id, actor_id, reason)`
   - admin-only;
   - creates a new job even when the current result is suppressed from normal
     automatic re-verification.

Application reads should use:

- `tracker_read.v_discovery_contacts` for the table;
- `tracker_read.v_contact_email_verification_due` for the worker queue;
- `tracker_read.v_contact_email_verification_history` for audit/detail views.

## Landing workflow

When a new contact with an email is persisted:

```text
record contact
  -> enqueue exactly one verification job
  -> worker claims job
  -> server calls Reoon Power mode over HTTPS
  -> controlled function records result
  -> table receives current status and visual marker
```

Existing emails are not rechecked merely because the contacts table is opened,
and a shared email is not submitted once per person. The identity cache is
checked before every provider submission.
The monthly worker selects only rows where:

```text
email_next_verification_at <= now()
and no active verification job exists
```

If the email is unchanged and a result is already current, no new landing-time
verification is created.

## UI markers

Use accessible text plus a small icon/color marker; color must not be the only
signal:

- green check: `safe`
- yellow/orange shared or uncertain: `role_account`, `catch_all`,
  `inbox_full`, `unknown`
- blue clock or shield: pending, stale, or provider verification in progress
- red X: `invalid`, `disabled`, `disposable`, or `spamtrap`
- grey warning: provider error or no email submitted

Tooltips should show the provider status, score, checked time, next due date,
and the fact that Reoon verifies deliverability—not role or authority.

## Implementation order

1. Add the provider adapter and response normalizer with mocked Power-mode
   responses.
2. Add the verification history table, current projection, due view, and
   controlled functions.
3. Connect new-contact persistence to enqueue exactly one job.
4. Add a bounded worker for one-email immediate verification and monthly due
   verification.
5. Add admin force-reverify with audit logging.
6. Add table markers, tooltips, and a detail panel showing history.
7. Test duplicate creation, shared-email deduplication, changed email, provider timeout, every status,
   concurrent claims, monthly eligibility, admin force, and no full-database
   retrieval.

## Sources

- Reoon API documentation: <https://www.reoon.com/articles/api-documentation-of-reoon-email-verifier/>
- Reoon status meanings: <https://www.reoon.com/articles/meaning-of-different-email-verification-statuses/>
- Reoon product/API overview: <https://emailverifier.reoon.com/>
