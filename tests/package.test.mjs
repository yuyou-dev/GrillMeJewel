import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const PLUGIN = resolve(ROOT, "plugins/grill-me-jewel");

test("marketplace and plugin identities are aligned", () => {
  const market = JSON.parse(readFileSync(resolve(ROOT, ".agents/plugins/marketplace.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(resolve(PLUGIN, ".codex-plugin/plugin.json"), "utf8"));
  assert.equal(market.name, "grill-me-jewel");
  assert.equal(market.plugins.length, 1);
  assert.equal(market.plugins[0].name, "grill-me-jewel");
  assert.equal(manifest.name, "grill-me-jewel");
  assert.equal(manifest.version, "0.1.1");
  assert.equal(manifest.license, "Apache-2.0");
  assert.equal(manifest.interface.developerName, "苏哇科技");
  assert.equal(manifest.interface.composerIcon, "./assets/brand/logo-static.png");
  assert.ok(existsSync(resolve(PLUGIN, manifest.interface.composerIcon)));
});

test("the plugin contains exactly one public skill", () => {
  const skillRoot = resolve(PLUGIN, "skills");
  const skills = readdirSync(skillRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && existsSync(resolve(skillRoot, entry.name, "SKILL.md")));
  assert.deepEqual(skills.map(({ name }) => name), ["grill-me-jewel"]);
  const skill = readFileSync(resolve(skillRoot, "grill-me-jewel/SKILL.md"), "utf8");
  assert.match(skill, /ask_grill_me_questions/);
  assert.match(skill, /gpt-image-2/);
  assert.match(skill, /\$imagegen/);
});

test("the standalone package has no unrelated repository dependency", () => {
  const files = [
    resolve(PLUGIN, ".codex-plugin/plugin.json"),
    resolve(PLUGIN, "skills/grill-me-jewel/SKILL.md"),
    resolve(PLUGIN, "skills/grill-me-jewel/references/design-frontier.md"),
  ];
  const joined = files.map((file) => readFileSync(file, "utf8")).join("\n");
  const unrelatedRepositoryNames = new RegExp(["Jewelry", "Design", "Codex|SVT", "-Jewelry"].join(""));
  assert.doesNotMatch(joined, unrelatedRepositoryNames);
});
