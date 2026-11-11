import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { createNeonAuth } from "../src/neon-auth.js";

test("does not authenticate when Neon Auth is not configured", async () => {
  const authenticate = createNeonAuth({});

  assert.equal(await authenticate(new Request("http://tracker.local/v1/projects")), null);
});

test("accepts a Neon JWT signed by the configured JWKS and rejects the wrong issuer", async (t) => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";

  const jwksServer = createServer((request, response) => {
    assert.equal(request.url, "/jwks.json");
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise((resolve) => jwksServer.listen(0, "127.0.0.1", resolve));
  t.after(() => jwksServer.close());

  const { port } = jwksServer.address();
  const authenticate = createNeonAuth({
    baseUrl: "https://auth.example.test/neondb/auth",
    jwksUrl: `http://127.0.0.1:${port}/jwks.json`,
  });
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer("https://auth.example.test")
    .setSubject("user-123")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  const wrongIssuerToken = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer("https://other.example.test")
    .setSubject("user-123")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  assert.deepEqual(
    await authenticate(new Request("http://tracker.local/v1/projects", { headers: { authorization: `Bearer ${token}` } })),
    { id: "user-123" },
  );
  assert.equal(
    await authenticate(new Request("http://tracker.local/v1/projects", { headers: { authorization: `Bearer ${wrongIssuerToken}` } })),
    null,
  );
});
