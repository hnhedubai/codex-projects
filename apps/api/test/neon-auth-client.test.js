import assert from "node:assert/strict";
import test from "node:test";

import { createAuthClient } from "@neondatabase/auth";

test("SDK deletion sends password and session cookies to the same-origin endpoint", async (t) => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (input, init) => {
    captured = new Request(input, init);
    return Response.json({ success: true, message: "User deleted" });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const client = createAuthClient("http://localhost:9500/api/auth");
  const result = await client.deleteUser({ password: "fixture-password" });
  assert.equal(captured.url, "http://localhost:9500/api/auth/delete-user");
  assert.equal(captured.method, "POST");
  assert.equal(captured.credentials, "include");
  assert.equal(captured.headers.has("authorization"), false);
  assert.deepEqual(await captured.json(), { password: "fixture-password" });
  assert.equal(result.data.success, true);
});

test("uses the Managed Better Auth email sign-up endpoint", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (input) => {
    requestedUrl = input instanceof Request ? input.url : String(input);
    return new Response(JSON.stringify({ message: "not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const auth = createAuthClient("https://auth.example.test/neondb/auth");
  await assert.rejects(
    auth.signUp.email({
      name: "Test User",
      email: "test@example.test",
      password: "not-a-real-password",
    }),
  );

  assert.equal(new URL(requestedUrl).pathname, "/neondb/auth/sign-up/email");
});
