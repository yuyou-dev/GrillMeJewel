import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const GMJ = resolve(ROOT, "scripts/gmj.mjs");
const run = (args, env = process.env) => spawnSync(process.execPath, [GMJ, ...args], { cwd: ROOT, env, encoding: "utf8" });

function fakeCodex(directory) {
  const statePath = join(directory, "state.json");
  const implementation = join(directory, "fake.mjs");
  writeFileSync(statePath, JSON.stringify({ marketplace: false, installed: false }));
  writeFileSync(implementation, `
import {readFileSync,writeFileSync} from "node:fs";
const path=${JSON.stringify(statePath)};const state=JSON.parse(readFileSync(path,"utf8"));const args=process.argv.slice(2).join(" ");const save=()=>writeFileSync(path,JSON.stringify(state));
if(args.startsWith("login status"))process.stdout.write("Logged in");
else if(args.startsWith("plugin marketplace list"))process.stdout.write(JSON.stringify({marketplaces:state.marketplace?[{name:"grill-me-jewel",marketplaceSource:{sourceType:"git",source:"https://github.com/yuyou-dev/GrillMeJewel.git"}}]:[]}));
else if(args.startsWith("plugin marketplace add")){state.marketplace=true;save();process.stdout.write("{}");}
else if(args.startsWith("plugin marketplace upgrade"))process.stdout.write("{}");
else if(args.startsWith("plugin list")){const installed=state.installed?[{pluginId:"grill-me-jewel@grill-me-jewel",name:"grill-me-jewel",marketplaceName:"grill-me-jewel",version:"0.1.0",installed:true,enabled:true}]:[];process.stdout.write(JSON.stringify({installed,available:[]}));}
else if(args.startsWith("plugin add")){state.installed=true;save();process.stdout.write("{}");}
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
  const directory = mkdtempSync(join(tmpdir(), "gmj lifecycle 中文 "));
  try {
    const codex = fakeCodex(directory); const env = { ...process.env, GMJ_CODEX_BIN: codex };
    const first = run(["bootstrap", "--json"], env); assert.equal(first.status, 0, `${first.stderr}\n${first.stdout}`); assert.equal(JSON.parse(first.stdout).actions.length, 2);
    const second = run(["bootstrap", "--json"], env); assert.equal(second.status, 0, `${second.stderr}\n${second.stdout}`); assert.equal(JSON.parse(second.stdout).actions.length, 0);
    const marker = join(directory, "my-design.txt"); writeFileSync(marker, "keep");
    const removed = run(["uninstall", "--json"], env); assert.equal(removed.status, 0, `${removed.stderr}\n${removed.stdout}`); assert.equal(readFileSync(marker, "utf8"), "keep");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
