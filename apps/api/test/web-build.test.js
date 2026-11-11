import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const publicDirectory = resolve("apps/web/public");

test("the built browser asset referenced by the login page exists", async () => {
  const html = await readFile(resolve(publicDirectory, "index.html"), "utf8");
  const match = html.match(/<script type="module" src="\/([^"/]+)"><\/script>/);

  assert.ok(match, "index.html must load one top-level browser module");
  const asset = resolve(publicDirectory, match[1]);
  await access(asset, constants.R_OK);
  assert.ok((await stat(asset)).size > 0, `${match[1]} must not be empty`);
});
