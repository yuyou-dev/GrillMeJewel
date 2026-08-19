import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const GMJ = resolve(ROOT, "scripts/gmj.mjs");
const run = (args, env = process.env) => spawnSync(process.execPath, [GMJ, ...args], { cwd: ROOT, env, encoding: "utf8" });

function fakeCodex(directory, initial = {}) {
  const statePath = join(directory, "state.json");
  const implementation = join(directory, "fake.mjs");
  writeFileSync(statePath, JSON.stringify({ marketplace: false, ref: null, installed: false, version: null, source: "https://github.com/yuyou-dev/GrillMeJewel.git", ...initial }));
  writeFileSync(implementation, `
import {readFileSync,writeFileSync} from "node:fs";
const path=${JSON.stringify(statePath)};const state=JSON.parse(readFileSync(path,"utf8"));const args=process.argv.slice(2).join(" ");const save=()=>writeFileSync(path,JSON.stringify(state));
const argv=process.argv.slice(2);const versionForRef=(ref)=>String(ref||"").replace(/^v/,"")||"0.2.0";
if(args.startsWith("login status"))process.stdout.write("Logged in");
else if(args.startsWith("plugin marketplace list"))process.stdout.write(JSON.stringify({marketplaces:state.marketplace?[{name:"grill-me-jewel",marketplaceSource:{sourceType:"git",source:state.source}}]:[]}));
else if(args.startsWith("plugin marketplace add")){const i=argv.indexOf("--ref");state.ref=i>=0?argv[i+1]:"v0.2.0";state.source="https://github.com/yuyou-dev/GrillMeJewel.git";state.marketplace=true;save();process.stdout.write("{}");}
else if(args.startsWith("plugin marketplace remove")){state.marketplace=false;state.installed=false;state.version=null;save();process.stdout.write("{}");}
else if(args.startsWith("plugin marketplace upgrade"))process.stdout.write("{}");
else if(args.startsWith("plugin list")){const installed=state.installed?[{pluginId:"grill-me-jewel@grill-me-jewel",name:"grill-me-jewel",marketplaceName:"grill-me-jewel",version:state.version,installed:true,enabled:true}]:[];const available=state.marketplace?[{name:"grill-me-jewel",marketplaceName:"grill-me-jewel",version:versionForRef(state.ref)}]:[];process.stdout.write(JSON.stringify({installed,available}));}
else if(args.startsWith("plugin add")){const version=versionForRef(state.ref);if(process.env.FAKE_FAIL_TARGET==="1"&&version==="0.2.0")process.exit(7);state.installed=true;state.version=version;save();process.stdout.write("{}");}
else if(args.startsWith("plugin remove")){state.installed=false;save();process.stdout.write("{}");}
else if(args.startsWith("mcp get"))process.stdout.write(JSON.stringify({name:"grill_me_jewel_ui",enabled:true}));
else process.stdout.write("{}");
`);
  if (process.platform === "win32") {
    const wrapper = join(directory, "fake.cmd"); writeFileSync(wrapper, `@echo off\r\n"${process.execPath}" "${implementation}" %*\r\n`); return wrapper;
  }
  const wrapper = join(directory, "fake"); writeFileSync(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${implementation}" "$@"\n`); chmodSync(wrapper, 0o755); return wrapper;
}

test("offline doctor verifies one skill and one UI resource", () => {
  const result = run(["doctor", "--offline", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "ready");
  assert.equal(payload.checks.plugin.skills, 1);
  assert.equal(payload.checks.plugin.uiResources, 1);
});

test("lifecycle dry-runs are deterministic", () => {
  for (const command of ["bootstrap", "update", "uninstall"]) {
    const first = run([command, "--dry-run", "--json"]); const second = run([command, "--dry-run", "--json"]);
    assert.equal(first.status, 0, first.stderr); assert.equal(first.stdout, second.stdout);
  }
});

test("bootstrap is idempotent and uninstall preserves user files", () => {
  const directory = mkdtempSync(join(tmpdir(), "gmj-lifecycle-"));
  try {
    const codex = fakeCodex(directory); const env = { ...process.env, GMJ_CODEX_BIN: codex };
    const first = run(["bootstrap", "--json"], env); assert.equal(first.status, 0, `${first.stderr}\n${first.stdout}`); assert.equal(JSON.parse(first.stdout).actions.length, 2);
    const second = run(["bootstrap", "--json"], env); assert.equal(second.status, 0, `${second.stderr}\n${second.stdout}`); assert.equal(JSON.parse(second.stdout).actions.length, 0);
    const marker = join(directory, "我的设计.txt"); writeFileSync(marker, "keep");
    const removed = run(["uninstall", "--json"], env); assert.equal(removed.status, 0, `${removed.stderr}\n${removed.stdout}`); assert.equal(readFileSync(marker, "utf8"), "keep");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("update migrates v0.1.1 to v0.2.0 with observable state", () => {
  const directory = mkdtempSync(join(tmpdir(), "gmj-update-"));
  try {
    const codex = fakeCodex(directory, { marketplace: true, ref: "v0.1.1", installed: true, version: "0.1.1" });
    const result = run(["update", "--json"], { ...process.env, GMJ_CODEX_BIN: codex });
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    const output = JSON.parse(result.stdout);
    assert.equal(output.status, "restart_required");
    assert.equal(output.fromVersion, "0.1.1");
    assert.equal(output.toVersion, "0.2.0");
    assert.equal(output.migration, "fixed-release-ref");
    assert.deepEqual(output.restoredPlugins, ["grill-me-jewel@grill-me-jewel"]);
    assert.equal(output.rolledBack, false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("update is idempotent at v0.2.0", () => {
  const directory = mkdtempSync(join(tmpdir(), "gmj-current-"));
  try {
    const codex = fakeCodex(directory, { marketplace: true, ref: "v0.2.0", installed: true, version: "0.2.0" });
    const output = JSON.parse(run(["update", "--json"], { ...process.env, GMJ_CODEX_BIN: codex }).stdout);
    assert.equal(output.status, "ready");
    assert.equal(output.migration, "already-current");
    assert.equal(output.rolledBack, false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("update stops on source conflict without mutation", () => {
  const directory = mkdtempSync(join(tmpdir(), "gmj-conflict-"));
  try {
    const codex = fakeCodex(directory, { marketplace: true, ref: "v0.1.1", installed: true, version: "0.1.1", source: "https://example.invalid/not-official.git" });
    const result = run(["update", "--json"], { ...process.env, GMJ_CODEX_BIN: codex });
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.match(output.reason, /different source/);
    assert.deepEqual(output.actions, []);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("failed target update restores v0.1.1", () => {
  const directory = mkdtempSync(join(tmpdir(), "gmj-rollback-"));
  try {
    const codex = fakeCodex(directory, { marketplace: true, ref: "v0.1.1", installed: true, version: "0.1.1" });
    const result = run(["update", "--json"], { ...process.env, GMJ_CODEX_BIN: codex, FAKE_FAIL_TARGET: "1" });
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.equal(output.rolledBack, true);
    assert.equal(output.fromVersion, "0.1.1");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
