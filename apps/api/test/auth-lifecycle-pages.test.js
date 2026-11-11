import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const pages = ["register", "verify", "login", "forgot-password", "reset-password", "account"];

test("ships six separate auth lifecycle pages with the shared isolated bundle", async () => {
  for (const page of pages) {
    const source = await readFile(new URL(`../../web/public/auth/${page}.html`, import.meta.url), "utf8");
    assert.match(source, /\/auth\/auth\.css/);
    assert.match(source, /\/auth\/auth-lifecycle\.js/);
  }
  await access(new URL("../../web/public/auth/auth-lifecycle.js", import.meta.url));
});
