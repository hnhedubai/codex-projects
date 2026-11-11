import assert from "node:assert/strict";
import test from "node:test";
import { createAccountDeleteHandler } from "../src/auth-account-delete.js";

const baseUrl = "https://ep-falling-river-b4qbvjsk.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth";
const user = { id: "da9c1949-a0ef-4208-b9fb-f0a46bf8e912", email: "fixture@example.test" };
function setup({ authenticated = true, passwordOk = true, removeFails = false } = {}) {
  const deleted = [];
  const handler = createAccountDeleteHandler({ baseUrl, cookieSecret: "fixture-secret-that-is-at-least-32-characters",
    authRequest: async (_base, request, path) => {
      if (path === "get-session") {
        assert.equal(new URL(request.url).searchParams.get("disableCookieCache"), "true");
        return Response.json(authenticated ? { user } : null);
      }
      assert.equal(path, "sign-in/email");
      const body = await request.json();
      assert.equal(body.email, user.email);
      assert.equal(body.password, "fixture-password");
      return Response.json(passwordOk ? { user } : { message: "Invalid password" }, {status:passwordOk ? 200 : 401});
    },
    removeUser: async id => { if (removeFails) throw new Error("provider failed"); deleted.push(id); },
    authProxy: async () => Response.json({success:true}, {headers:{"set-cookie":"session=; Max-Age=0; Path=/; HttpOnly"}}),
  });
  return { handler, deleted };
}
function request(origin = "http://localhost:9500") {
  return new Request("http://localhost:9500/api/auth/delete-user", {method:"POST", headers:{origin,"content-type":"application/json"}, body:JSON.stringify({password:"fixture-password",userId:"a-victim-id",email:"victim@example.test"})});
}
test("deletion reauthenticates and removes only the session owner, then clears cookies", async () => {
  const {handler, deleted} = setup();
  const response = await handler(request());
  assert.equal(response.status,200);
  assert.deepEqual(deleted,[user.id]);
  assert.equal((await response.json()).message,"User deleted");
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
});
for (const [label, options, status] of [
  ["missing session", {authenticated:false},401],
  ["wrong password", {passwordOk:false},403],
  ["provider failure", {removeFails:true},503],
]) test(`rejects ${label} without reporting a deletion`, async () => {
  const {handler,deleted} = setup(options);
  assert.equal((await handler(request())).status,status);
  assert.deepEqual(deleted,[]);
});
test("rejects cross-origin deletion", async () => {
  const {handler,deleted}=setup();
  assert.equal((await handler(request("https://attacker.example"))).status,403);
  assert.deepEqual(deleted,[]);
});
test("refuses a different Neon branch", () => {
  assert.throws(()=>createAccountDeleteHandler({baseUrl:"https://other.example/auth"}),/v3 branch/);
});
