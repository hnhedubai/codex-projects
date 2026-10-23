// Quick revert: set false, restart 8181, and reload the browser.
// The original Outreach renderer, controls, storage and strict disclosure gate remain in place.
export const OUTREACH_PROJECT_PICKER = true;
// False retains the pre-V2 generator, recipient wording and disclosure policy.
export const OUTREACH_DRAFT_V2 = true;
// Allows the UI to request an explicit Pulse catch-all consent retry.
// Set false to restore the previous strict behavior without changing stored history.
export const OUTREACH_CATCHALL_CONSENT = true;
// balanced: coarse size/stage and broad region; strict: technology only.
export const OUTREACH_SUBJECT_ANONYMITY = 'balanced';
