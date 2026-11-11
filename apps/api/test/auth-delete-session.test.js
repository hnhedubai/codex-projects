import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

async function loadLifecycle(client, fetchImpl) {
  const source = await readFile(new URL("../../web/src/auth-lifecycle.js", import.meta.url), "utf8");
  const context = vm.createContext({
    createAuthClient: () => client,
    URL, URLSearchParams,
    window: { location: { search: "", origin: "http://localhost:9500" }, setTimeout, clearTimeout },
    document: { querySelector: () => null, querySelectorAll: () => [] },
    fetch: fetchImpl ?? (async () => ({ ok: true, json: async () => ({ authPath: "/api/auth" }) })),
  });
  vm.runInContext(source.replace(/^import .*;\r?\n/, ""), context);
  return (password) => vm.runInContext(`deleteCurrentAccount(${JSON.stringify(password)})`, context);
}

test("deletion uses the authenticated session without requiring a separate JWT", async () => {
  let deletions = 0;
  const remove = await loadLifecycle({
    token: async () => ({ data: { token: null }, error: null }),
    deleteUser: async ({ password }) => {
      assert.equal(password, "fixture-password");
      deletions++;
      return { data: { success: true, message: "User deleted" }, error: null };
    },
  });
  await remove("fixture-password");
  assert.equal(deletions, 1);
});

test("deletion preserves authentication errors and does not report success", async () => {
  const remove = await loadLifecycle({
    deleteUser: async () => ({ data: null, error: { message: "Invalid password" } }),
  });
  await assert.rejects(remove("wrong-password"), /Invalid password/);
});

test("a pending deletion verification is not treated as a deleted account", async () => {
  const remove = await loadLifecycle({
    deleteUser: async () => ({ data: { success: true, message: "Verification email sent" }, error: null }),
  });
  await assert.rejects(remove("fixture-password"), /verification/i);
});
