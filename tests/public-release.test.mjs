import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
test("install prompt and release ref target the official repository", () => {
  const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
  const install = readFileSync(resolve(ROOT, "INSTALL.md"), "utf8");
  assert.match(readme, /raw\.githubusercontent\.com\/yuyou-dev\/GrillMeJewel\/main\/INSTALL\.md/);
  assert.match(install, /yuyou-dev\/GrillMeJewel/);
  assert.match(install, /--ref v0\.1\.1/);
});
