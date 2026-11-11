// Hydrogen Offtaker: send outreach through GrynH2 Pulse, same mechanism as apps/wind-projects.
// The Pulse key stays on the server (PULSE_SEND_KEY, read by wind-projects/reoon.mjs from the environment or apps/api/.env).
import { join } from "node:path";
import { loadPulseConfig, createPulseClient, runSend, MAX_RECIPIENTS, SEND_DEADLINE_MS } from "../../wind-projects/pulse.mjs";
import { createSendStore } from "../../wind-projects/send-store.mjs";
import { isEmail, normalizeEmail } from "../../wind-projects/reoon.mjs";
import { placeholderPattern, greetingName } from "../../wind-projects/dist/format.mjs";

const FIELDS = ["to", "cc", "bcc"];
// [Name] is a merge field in one-by-one mode only: it is filled in per recipient below, so it is not an unfinished placeholder there.
const NAME_FIELD = /\[\s*name\s*\]/gi;
const withoutNameField = (text, mode) => (mode === "separate" ? String(text).replace(NAME_FIELD, "") : String(text));
const LOCAL_HOST = /^(localhost|127\.0\.0\.1)$/;

/** Validates a send request. There is no server-side contact store for hydrogen, so every address is checked for shape and Pulse's own recipient gate makes the final call. Throws "Pulse …" messages. */
export function validateHydrogenSend(input) {
  const mode = input?.mode;
  if (!["separate", "together"].includes(mode)) throw Error("Pulse send mode must be one by one or one email.");
  const candidateId = typeof input.candidateId === "string" ? input.candidateId.trim() : "";
  if (!candidateId || candidateId.length > 200) throw Error("Pulse send needs the hydrogen record it belongs to.");
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!subject || subject.length > 300) throw Error("Pulse send needs a subject line of up to 300 characters.");
  if (!body || body.length > 20000) throw Error("Pulse send needs a message body of up to 20,000 characters.");
  const leftover = withoutNameField(subject, mode).match(placeholderPattern)?.[0] || withoutNameField(body, mode).match(placeholderPattern)?.[0];
  if (leftover) throw Error(`Pulse send blocked: the draft still has ${leftover}. Pulse adds your signature.`);
  if (!Array.isArray(input.recipients) || !input.recipients.length) throw Error("Pulse send needs at least one recipient.");
  if (input.recipients.length > MAX_RECIPIENTS * 3) throw Error(`Pulse send allows up to ${MAX_RECIPIENTS} recipients.`);
  const byEmail = new Map();
  for (const recipient of input.recipients) {
    const email = normalizeEmail(recipient?.email);
    if (!isEmail(email)) throw Error("Pulse send has an invalid email address.");
    const field = mode === "separate" ? "to" : recipient.field;
    if (!FIELDS.includes(field)) throw Error("Pulse send recipients must be To, CC or BCC.");
    const name = typeof recipient.name === "string" ? recipient.name.trim().slice(0, 120) : "";
    const prior = byEmail.get(email);
    if (!prior || FIELDS.indexOf(field) < FIELDS.indexOf(prior.field)) byEmail.set(email, { contactId: email, name, email, field });
  }
  const recipients = [...byEmail.values()];
  if (recipients.length > MAX_RECIPIENTS) throw Error(`Pulse send allows up to ${MAX_RECIPIENTS} recipients.`);
  if (mode === "together" && !recipients.some((r) => r.field === "to")) throw Error("Pulse send needs at least one To recipient.");
  return { projectId: `hydrogen:${candidateId}`, mode, subject, body, recipients };
}

/** One by one: each person gets their own call with [Name] resolved to their greeting name; one email: a single call. Same result shape as runSend. */
export async function runHydrogenSend(send, pulse, { now = () => Date.now() } = {}) {
  if (send.mode !== "separate") return runSend(send, pulse);
  const stop = now() + SEND_DEADLINE_MS;
  const results = []; const summary = { sent: 0, blocked: 0, failed: 0 };
  for (const recipient of send.recipients) {
    const who = greetingName(recipient.name) || "colleague";
    const resolve = (text) => text.replace(NAME_FIELD, who);
    const one = await runSend({ ...send, subject: resolve(send.subject), body: resolve(send.body), recipients: [recipient] }, pulse, { deadlineMs: Math.max(0, stop - now()), now });
    results.push(...one.results);
    for (const key of Object.keys(summary)) summary[key] += one.summary[key];
  }
  return { results, summary, workflowUpdate: summary.sent > 0 ? { emailStatus: "sent", workflow: "Contacted" } : null };
}

/** Only this machine's own page may call the send routes (blocks other websites and DNS-rebinding hosts). */
export function isTrustedLocalCall(request, url) {
  if (!LOCAL_HOST.test(url.hostname)) return false;
  if (request.headers.get("x-hydrogen-send") !== "1") return false;
  const origin = request.headers.get("origin");
  if (origin) { try { if (new URL(origin).host !== url.host) return false; } catch { return false; } }
  return true;
}

export function createHydrogenPulse({
  pulsePromise = loadPulseConfig().then(createPulseClient),
  sendStorePromise = createSendStore(join(process.cwd(), "data", "hydrogen-pulse-sends.json")),
} = {}) {
  let sending = false;
  // Avoid an unhandled rejection at startup; the error still surfaces when a route awaits these.
  Promise.resolve(pulsePromise).catch(() => {}); Promise.resolve(sendStorePromise).catch(() => {});
  const json = (status, body) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
  return {
    /** Returns a Response for the two Pulse routes, or null for any other route. */
    async handle(request, url) {
      const isHistory = request.method === "GET" && url.pathname === "/api/hydrogen/sends";
      const isSend = request.method === "POST" && url.pathname === "/api/hydrogen/send";
      if (!isHistory && !isSend) return null;
      if (!isTrustedLocalCall(request, url)) return json(403, { error: "Pulse send is only available from this workspace page." });
      try {
        const pulse = await pulsePromise;
        const sendStore = await sendStorePromise;
        if (isHistory) {
          const candidateId = (url.searchParams.get("candidateId") || "").slice(0, 200);
          return json(200, { enabled: pulse.enabled === true, sends: candidateId ? sendStore.list(`hydrogen:${candidateId}`) : [] });
        }
        let input; try { input = await request.json(); } catch { return json(422, { error: "Invalid JSON body." }); }
        const send = validateHydrogenSend(input);
        if (!pulse.enabled) return json(503, { error: "Pulse is not connected. Set PULSE_SEND_KEY and restart the server." });
        if (sending) return json(409, { error: "Pulse send already in progress. Wait for it to finish." });
        sending = true;
        try {
          const outcome = await runHydrogenSend(send, pulse);
          await sendStore.record({
            projectId: send.projectId, mode: send.mode, subject: send.subject,
            recipients: send.recipients.map(({ email, name, field }) => ({ email, name, field })),
            // `verification` is Pulse's reason for a blocked recipient; wind-projects drops it, here it is kept and shown.
            results: outcome.results.map(({ emails, status, httpStatus, error, verification, emailMessageId, replay }) => ({ emails, status, httpStatus, error, verification: verification ?? null, emailMessageId: emailMessageId || null, replay: !!replay })),
            summary: outcome.summary,
          });
          return json(200, outcome);
        } finally { sending = false; }
      } catch (error) {
        const message = String(error?.message || "");
        if (/^Pulse /.test(message)) return json(422, { error: message });
        console.error("hydrogen pulse send failed:", message);
        return json(500, { error: "The Pulse send could not be completed. Nothing was recorded as sent." });
      }
    },
  };
}
