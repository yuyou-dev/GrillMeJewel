#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MARKETPLACE = "grill-me-jewel";
const SOURCE = "yuyou-dev/GrillMeJewel";
const REF = "v0.1.1";
const PLUGIN = "grill-me-jewel";
const PLUGIN_ID = `${PLUGIN}@${MARKETPLACE}`;
const MCP = "grill_me_jewel_ui";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const [command = "doctor", ...flags] = argv;
  if (!["bootstrap", "doctor", "update", "uninstall"].includes(command)) throw new Error(`unknown command: ${command}`);
  const allowed = new Set(["--json", "--dry-run", "--offline"]);
  const unknown = flags.find((flag) => !allowed.has(flag));
  if (unknown) throw new Error(`unknown option: ${unknown}`);
  return { command, json: flags.includes("--json"), dryRun: flags.includes("--dry-run"), offline: flags.includes("--offline") };
}

function executable(name) {
  const suffixes = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const folder of String(process.env.PATH || "").split(delimiter).filter(Boolean)) {
    for (const suffix of suffixes) {
      const candidate = join(folder, `${name}${suffix}`);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function resolveCodex() {
  const candidates = [process.env.GMJ_CODEX_BIN];
  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/ChatGPT.app/Contents/Resources/codex",
      "/Applications/Codex.app/Contents/Resources/codex",
    );
  }
  if (process.platform === "win32") {
    for (const base of [process.env.LOCALAPPDATA, process.env.ProgramFiles]) {
      if (!base) continue;
      candidates.push(
        join(base, "ChatGPT", "resources", "codex.exe"),
        join(base, "Programs", "ChatGPT", "resources", "codex.exe"),
        join(base, "OpenAI", "ChatGPT", "codex.exe"),
      );
    }
  }
  candidates.push(executable("codex"));
  return candidates.find((candidate) => candidate && existsSync(candidate)) || null;
}

function execute(command, args, { json = false } = {}) {
  const shell = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(command);
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true, shell });
  if (result.error) throw new Error(`unable to start ${args[0] || command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || "command failed").trim().split("\n")[0]);
  if (!json) return result.stdout.trim();
  try { return JSON.parse(result.stdout); } catch { throw new Error(`invalid JSON from Codex: ${args.slice(0, 3).join(" ")}`); }
}

function sourceMatches(value) {
  const normalized = String(value || "").replace(/\.git$/i, "").replace(/^git@github\.com:/i, "github.com/");
  return [SOURCE, `https://github.com/${SOURCE}`, `ssh://git@github.com/${SOURCE}`, `github.com/${SOURCE}`].includes(normalized);
}

function marketplace(payload) { return (payload.marketplaces || []).find(({ name }) => name === MARKETPLACE); }
function installed(payload, includeDisabled = false) {
  return (payload.installed || []).find((entry) => entry.pluginId === PLUGIN_ID && entry.installed !== false && (includeDisabled || entry.enabled !== false));
}

function localChecks() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  const git = executable("git");
  const gitVersion = git ? spawnSync(git, ["--version"], { encoding: "utf8", windowsHide: true }).stdout.trim() : "";
  const gitMatch = /git version (\d+)\.(\d+)/i.exec(gitVersion);
  const pluginRoot = join(ROOT, "plugins", PLUGIN);
  const required = [
    join(pluginRoot, ".codex-plugin", "plugin.json"),
    join(pluginRoot, ".mcp.json"),
    join(pluginRoot, "mcp", "server.mjs"),
    join(pluginRoot, "mcp", "interview.html"),
    join(pluginRoot, "assets", "brand", "logo-static.png"),
    join(pluginRoot, "assets", "brand", "logo-header.webp"),
    join(pluginRoot, "skills", "grill-me-jewel", "SKILL.md"),
  ];
  const skillsRoot = join(pluginRoot, "skills");
  const skills = existsSync(skillsRoot) ? readdirSync(skillsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && existsSync(join(skillsRoot, entry.name, "SKILL.md"))).length : 0;
  return {
    node: { ok: nodeMajor >= 20, version: process.versions.node },
    git: { ok: Boolean(gitMatch) && (Number(gitMatch[1]) > 2 || (Number(gitMatch[1]) === 2 && Number(gitMatch[2]) >= 30)), version: gitVersion },
    plugin: { ok: required.every(existsSync) && skills === 1, skills, uiResources: existsSync(required[3]) ? 1 : 0 },
  };
}

function ready(checks) { return Object.values(checks).every(({ ok }) => ok); }
function inspect(codex) {
  return {
    marketplaces: execute(codex, ["plugin", "marketplace", "list", "--json"], { json: true }),
    plugins: execute(codex, ["plugin", "list", "--available", "--json"], { json: true }),
  };
}
function conflict(state) {
  const configured = marketplace(state.marketplaces);
  if (configured && !sourceMatches(configured.marketplaceSource?.source)) return `marketplace ${MARKETPLACE} points to a different source`;
  const other = (state.plugins.installed || []).find(({ name, marketplaceName, enabled }) => name === PLUGIN && marketplaceName !== MARKETPLACE && enabled !== false);
  return other ? `enabled plugin ${other.pluginId} conflicts with ${PLUGIN_ID}` : null;
}
function action(label, args) { return { label, command: "codex", args }; }
function applyAction(codex, item, dryRun) { if (!dryRun) execute(codex, [...item.args, "--json"], { json: true }); }

async function doctor(options) {
  const checks = localChecks();
  if (!ready(checks)) return { command: "doctor", status: "blocked", offline: options.offline, checks, actions: [] };
  if (options.offline) return { command: "doctor", status: "ready", offline: true, checks, actions: [] };
  const codex = resolveCodex(); checks.codex = { ok: Boolean(codex) };
  if (!codex) return { command: "doctor", status: "blocked", offline: false, checks, actions: [], reason: "Codex CLI was not found" };
  try {
    execute(codex, ["login", "status"]); checks.login = { ok: true };
    const state = inspect(codex); const reason = conflict(state);
    checks.marketplace = { ok: Boolean(marketplace(state.marketplaces)) && !reason };
    checks.installedPlugin = { ok: Boolean(installed(state.plugins)) };
    let mcp = null;
    if (checks.installedPlugin.ok) { try { mcp = execute(codex, ["mcp", "get", MCP, "--json"], { json: true }); } catch {} }
    checks.mcp = { ok: mcp?.name === MCP && mcp?.enabled !== false };
    return { command: "doctor", status: reason || !checks.marketplace.ok || !checks.installedPlugin.ok ? "blocked" : checks.mcp.ok ? "ready" : "restart_required", offline: false, checks, actions: [], ...(reason ? { reason } : {}) };
  } catch (caught) {
    checks.login = { ok: false };
    return { command: "doctor", status: "blocked", offline: false, checks, actions: [], reason: caught.message };
  }
}

async function bootstrap(options) {
  const addMarket = action("add marketplace", ["plugin", "marketplace", "add", SOURCE, "--ref", REF]);
  const addPlugin = action("install plugin", ["plugin", "add", PLUGIN_ID]);
  if (options.dryRun) return { command: "bootstrap", status: "restart_required", dryRun: true, actions: [addMarket, addPlugin] };
  const checks = localChecks();
  if (!ready(checks)) return { command: "bootstrap", status: "blocked", dryRun: false, checks, actions: [], reason: "Node 20+ and Git 2.30+ are required" };
  const codex = resolveCodex();
  if (!codex) return { command: "bootstrap", status: "blocked", dryRun: false, checks, actions: [], reason: "Codex CLI was not found" };
  try { execute(codex, ["login", "status"]); } catch { return { command: "bootstrap", status: "blocked", dryRun: false, checks, actions: [], reason: "Codex is not logged in" }; }
  let state = inspect(codex); const reason = conflict(state);
  if (reason) return { command: "bootstrap", status: "blocked", dryRun: false, checks, actions: [], reason };
  const actions = [];
  if (!marketplace(state.marketplaces)) { applyAction(codex, addMarket, false); actions.push(addMarket); state = inspect(codex); }
  if (!installed(state.plugins)) { applyAction(codex, addPlugin, false); actions.push(addPlugin); }
  return { command: "bootstrap", status: actions.length ? "restart_required" : "ready", dryRun: false, checks, actions };
}

async function update(options) {
  const actions = [action("upgrade marketplace", ["plugin", "marketplace", "upgrade", MARKETPLACE]), action("refresh plugin", ["plugin", "add", PLUGIN_ID])];
  if (options.dryRun) return { command: "update", status: "restart_required", dryRun: true, actions };
  const codex = resolveCodex();
  if (!codex) return { command: "update", status: "blocked", dryRun: false, actions: [], reason: "Codex CLI was not found" };
  const state = inspect(codex); const reason = conflict(state);
  if (reason) return { command: "update", status: "blocked", dryRun: false, actions: [], reason };
  if (!marketplace(state.marketplaces)) return { command: "update", status: "blocked", dryRun: false, actions: [], reason: "run bootstrap before update" };
  for (const item of actions) applyAction(codex, item, false);
  return { command: "update", status: "restart_required", dryRun: false, actions };
}

async function uninstall(options) {
  const item = action("remove plugin", ["plugin", "remove", PLUGIN_ID]);
  if (options.dryRun) return { command: "uninstall", status: "ready", dryRun: true, actions: [item] };
  const codex = resolveCodex();
  if (!codex) return { command: "uninstall", status: "blocked", dryRun: false, actions: [], reason: "Codex CLI was not found" };
  const state = inspect(codex); const actions = [];
  if (installed(state.plugins, true)) { applyAction(codex, item, false); actions.push(item); }
  return { command: "uninstall", status: actions.length ? "restart_required" : "ready", dryRun: false, actions };
}

function print(result, json) {
  if (json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else {
    process.stdout.write(`GrillMeJewel ${result.command}: ${result.status}\n`);
    for (const item of result.actions || []) process.stdout.write(`- ${item.label}\n`);
    if (result.reason) process.stderr.write(`${result.reason}\n`);
  }
}

async function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
    if (options.offline && options.command !== "doctor") throw new Error("--offline is only supported by doctor");
    const result = await ({ bootstrap, doctor, update, uninstall })[options.command](options);
    print(result, options.json); return result.status === "blocked" ? 1 : 0;
  } catch (caught) {
    const result = { command: options?.command || argv[0] || "doctor", status: "blocked", reason: caught.message, actions: [] };
    print(result, options?.json || argv.includes("--json")); return 1;
  }
}

const direct = process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]));
if (direct) process.exitCode = await main();
export { main };
