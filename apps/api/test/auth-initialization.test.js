import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("the isolated auth lifecycle initializes a client and always releases submit buttons", async () => {
  const source = await readFile(new URL("../../web/src/auth-lifecycle.js", import.meta.url), "utf8");

  assert.match(source, /const authClient = authConfiguration\.then/);
  assert.match(source, /finally \{\s*button\.disabled = false;/);
  assert.match(source, /ACTION_TIMEOUT_MS = 20_000/);
  assert.match(source, /await withTimeout\(\(\) => handler\(formValues\(form\)\)\)/);
  assert.match(source, /client\.emailOtp\.verifyEmail/);
  assert.match(source, /createAuthClient\(new URL\(authPath, window\.location\.origin\)\.toString\(\)\)/);
  assert.doesNotMatch(source, /createAuthClient\(authUrl\)/);
  assert.match(source, /email-otp\/request-password-reset/);
  assert.match(source, /email-otp\/reset-password/);
  assert.match(source, /delete-user/);
});
