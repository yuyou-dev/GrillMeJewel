import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const PLUGIN = resolve(ROOT, "plugins/jewel-buddy");

test("repository exposes Jewel Buddy as a WorkBuddy marketplace plugin", () => {
  const marketplace = JSON.parse(readFileSync(resolve(ROOT, ".codebuddy-plugin/marketplace.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(resolve(PLUGIN, ".codebuddy-plugin/plugin.json"), "utf8"));
  assert.equal(marketplace.name, "jewel-buddy-marketplace");
  assert.deepEqual(marketplace.plugins.map(({ name }) => name), ["jewel-buddy"]);
  assert.equal(marketplace.plugins[0].source, "./plugins/jewel-buddy");
  assert.equal(marketplace.plugins[0].name, manifest.name);
  assert.equal(marketplace.plugins[0].version, manifest.version);
});

test("WorkBuddy plugin manifest and MCP identity are aligned", () => {
  const rootPackage = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
  const marketplace = JSON.parse(readFileSync(resolve(ROOT, ".codebuddy-plugin/marketplace.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(resolve(PLUGIN, ".codebuddy-plugin/plugin.json"), "utf8"));
  const mcp = JSON.parse(readFileSync(resolve(PLUGIN, ".mcp.json"), "utf8"));
  assert.equal(manifest.name, "jewel-buddy");
  assert.equal(manifest.version, "0.3.4");
  assert.equal(rootPackage.version, manifest.version);
  assert.equal(marketplace.version, manifest.version);
  assert.equal(marketplace.plugins[0].version, manifest.version);
  assert.equal(manifest.license, "Apache-2.0");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.deepEqual(Object.keys(mcp.mcpServers), ["jewel-buddy"]);
  assert.equal(mcp.mcpServers["jewel-buddy"].command, "node");
  assert.deepEqual(mcp.mcpServers["jewel-buddy"].args, [
    "${CODEBUDDY_PLUGIN_ROOT}/mcp/server.mjs",
    "--stdio",
  ]);
  assert.equal(mcp.mcpServers["jewel-buddy"].url, undefined);
  assert.equal(existsSync(resolve(PLUGIN, "mcp/server.mjs")), true);
  assert.equal(existsSync(resolve(PLUGIN, "mcp/interview.html")), true);
});

test("the plugin contains one WorkBuddy skill with interview and image handoff rules", () => {
  const skillRoot = resolve(PLUGIN, "skills");
  const skills = readdirSync(skillRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(skillRoot, entry.name, "SKILL.md")));
  assert.deepEqual(skills.map(({ name }) => name), ["jewel-buddy"]);
  const skill = readFileSync(resolve(skillRoot, "jewel-buddy/SKILL.md"), "utf8");
  assert.match(skill, /name: jewel-buddy/);
  assert.match(skill, /ask_grill_me_questions/);
  assert.match(skill, /image-generation tool available in WorkBuddy/);
  assert.match(skill, /show_jewel_results/);
  assert.match(skill, /source_path/);
  assert.match(skill, /four discovery stages/);
  assert.match(skill, /delivery_count/);
  assert.match(skill, /at least three visible design axes/);
  assert.match(skill, /Never replace the Apps UI with native conversation cards/);
  assert.match(skill, /use `gold_18k`,\s*never `18k_gold`/);
  assert.match(skill, /primary and only user-facing response/i);
  assert.match(skill, /never (?:invoke|emit).*analysis, reasoning, or hidden planning/i);
  assert.match(skill, /end the turn immediately/i);
  assert.match(skill, /never (?:call|invoke) `show_jewel_results` in parallel/i);
  assert.match(skill, /wait\s+until.*image-generation tool.*returned successfully/is);
  assert.match(skill, /native image.*presentation.*before.*`show_jewel_results`/is);
  assert.doesNotMatch(skill, /After submission, summarize/);
  assert.doesNotMatch(skill, /Return the final brief in Markdown under/);
  assert.doesNotMatch(skill, /\$imagegen|gpt-image-2|Codex/);
});

test("brand assets stay in the same supported surface as the Codex release", () => {
  const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
  assert.match(readme, /plugins\/jewel-buddy\/assets\/brand\/logo-header\.webp/);
  assert.equal(existsSync(resolve(PLUGIN, "assets/brand/logo-header.webp")), true);
  assert.equal(existsSync(resolve(PLUGIN, "assets/brand/logo-static.png")), false);
  const manifest = JSON.parse(readFileSync(resolve(PLUGIN, ".codebuddy-plugin/plugin.json"), "utf8"));
  assert.equal(manifest.interface, undefined);
});

test("the active WorkBuddy surface has no OpenAI host bridge dependency", () => {
  const files = [
    resolve(PLUGIN, ".codebuddy-plugin/plugin.json"),
    resolve(PLUGIN, ".mcp.json"),
    resolve(PLUGIN, "mcp/server.mjs"),
    resolve(PLUGIN, "mcp/interview.html"),
    resolve(PLUGIN, "skills/jewel-buddy/SKILL.md"),
  ];
  const joined = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(joined, /window\.openai|openai\/outputTemplate|\.codex-plugin/);
});
