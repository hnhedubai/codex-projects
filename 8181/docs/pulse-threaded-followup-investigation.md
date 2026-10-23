# Pulse Email Service: Threaded Follow-up Investigation

Date: 2026-10-23

Read-only investigation of the Pulse sending path used by the 8181 app (Investors & JV). Nothing was changed, sent or exposed. The 8181 side is verified from code. The Pulse server and mail provider could not be inspected, because access to the GrynH2 folder was denied.

## Summary

8181 sends through one Pulse endpoint and has no reply or threading support. It stores only a Pulse database ID per send, not the RFC Message-ID, provider ID or thread ID. Incoming replies are not read anywhere in 8181. Whether Pulse or its provider supports true replies is unknown until the Pulse service code is inspected.

## Sending API (8181 to Pulse)

- Endpoint: `POST {PULSE_API_URL or https://api.grynh2.com}/api/pulse/external/send` (`platform-shell/server/pulse/pulse-client.mjs:26,29`).
- Headers: `Content-Type` and `Authorization` (Bearer). The key comes from `PULSE_SEND_KEY` and is never sent to the browser (`pulse-client.mjs:12,34`).
- Request fields sent today (`send-request.mjs:61,68`): `to`, `cc`, `bcc`, `subject`, `body_html`, `body_text`, `idempotency_key`.
- Response fields read (`pulse-client.mjs:39-41`): `sent` (must be `true`), `emailMessageId`, `idempotentReplay`. A 422 with `code: "recipients_blocked"` is treated as blocked (line 42).
- Not sent or handled anywhere: parent message ID, thread or conversation ID, In-Reply-To, References. Whether Pulse supports them is unknown.

## Original-message identifiers

- `emailMessageId` is stored per send in `platform-shell/data/pulse-sends/investors-jv.json` (`send-history-store.mjs:46`). The stored value is a 36-character UUID (8-4-4-4-12), with no `@` and no angle brackets.
- It is a Pulse database ID, not an RFC Message-ID header. It is almost certainly not a provider ID either, though that cannot be proven from the 8181 side.
- The RFC Message-ID, provider message ID and conversation ID are not stored anywhere in 8181. Retrieving them would need a Pulse endpoint, which is unknown.
- The browser history view deliberately strips `emailMessageId` (`send-history-store.mjs:60`, asserted in `pulse-send.test.mjs:74`).

## Idempotency

- The key is `oplatform:<module>:` plus a SHA-256 of record, mode, recipient(s), subject and body (`send-request.mjs:56,61,68`).
- A retry with identical content produces the same key, and Pulse should answer with `idempotentReplay` (`pulse-client.mjs:35,40`).
- A follow-up with a different body gets a new key. A follow-up with identical subject and body would be treated as a replay, so a threaded follow-up must add the parent reference to the key's inputs.

## Response tracking

- Nothing in 8181 reads incoming replies. "Response received" is a manual workflow status (`modules/wind-projects/tests/outreach-signals.test.mjs`), and `docs/platform-plan.md:222` lists response status as planned.
- The history store has no `receivedAt` or `repliedAt` field.
- Whether Pulse can detect replies, or tell bounces and automatic replies from human ones, is unknown.

## Safety checks to preserve

All of these run in 8181 before any Pulse call (`send-request.mjs`, `send-service.mjs:14-18`, `send-modules.mjs:19`):

- recipient and placeholder validation
- the outreach checklist
- the anonymity check
- the single-send lock
- history written before the call
- Pulse's own recipient blocking

## Not verified

These need the Pulse server or provider code:

1. Which provider sends the mail.
2. Whether `/api/pulse/external/send` accepts reply parameters, and their exact names.
3. Whether Pulse keeps the RFC Message-ID, provider ID and thread ID, and an endpoint to fetch them.
4. How Pulse sets From, signature and threading headers.
5. Reply and bounce detection, and any webhook fields.

No JSON example for threaded sends is given, because any field names would be guesses.

## Smallest change if threading is unsupported

- Pulse: accept an optional `reply_to_email_message_id` (the UUID 8181 already stores). Pulse resolves it, sets `In-Reply-To` and `References` itself, and returns the new message's identifiers. Requests without the field behave exactly as today.
- 8181: keep an optional `parentSendId` on the offer-history entry, pass the stored UUID in the payload, and include it in the idempotency key. All existing checks stay as they are.

## Next step

Grant read access to the folder holding the Pulse service code (the one behind api.grynh2.com), or paste the file that defines the `/api/pulse/external/send` route and its provider integration. Sections on the sending contract, identifiers, threading and response tracking can then be completed with file and line references.
