#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildManagedServiceSpec,
  installManagedService,
  verifyManagedService,
} from "./managed-mcp-service.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONNECTOR_NAME = "jewel-buddy";
const DEFAULT_HTTP_URL = "http://127.0.0.1:39528/mcp";
const INSTALLER_VERSION = "0.3.4";
const SKILL_MARKER = ".jewel-buddy-workbuddy.json";
const CLI_TIMEOUT_MS = 45_000;

export function buildConnectorSpec({
  root = ROOT,
  nodeBinary = process.execPath,
  configDir = process.env.CODEBUDDY_CONFIG_DIR || join(homedir(), ".workbuddy"),
  platformName = platform(),
  homeDirectory = homedir(),
  port = Number(process.env.JEWEL_BUDDY_HTTP_PORT || "39528"),
} = {}) {
  const serverPath = resolve(root, "plugins/jewel-buddy/mcp/server.mjs");
  const skillSource = resolve(root, "plugins/jewel-buddy/skills/jewel-buddy");
  const skillTarget = resolve(configDir, "skills/jewel-buddy");
  const managedService = buildManagedServiceSpec({
    root,
    nodeBinary,
    configDir,
    homeDirectory,
    platformName,
    port,
    version: INSTALLER_VERSION,
  });
  return {
    name: CONNECTOR_NAME,
    transport: "http",
    configDir,
    serverPath,
    skillSource,
    skillTarget,
    skillMarker: resolve(skillTarget, SKILL_MARKER),
    appsDiagnosticPath: resolve(configDir, "logs/mcp-apps-diag.log"),
    managedService,
    url: managedService.endpoint,
    addArgs: [
      "mcp",
      "add",
      CONNECTOR_NAME,
      managedService.endpoint,
      "--scope",
      "user",
      "--transport",
      "http",
    ],
  };
}

function sameFile(source, target) {
  return existsSync(source) && existsSync(target) && readFileSync(source).equals(readFileSync(target));
}

export function skillMatches(spec) {
  return [
    "SKILL.md",
    "references/design-frontier.md",
    "references/image2-generation.md",
  ].every((file) => sameFile(resolve(spec.skillSource, file), resolve(spec.skillTarget, file)));
}

export function classifyExistingSkill(spec) {
  if (!existsSync(spec.skillTarget)) return "missing";
  if (skillMatches(spec)) return "current";
  if (existsSync(spec.skillMarker)) {
    try {
      const marker = JSON.parse(readFileSync(spec.skillMarker, "utf8"));
      if (marker.managedBy === "jewel-buddy-workbuddy") return "managed-update";
    } catch {}
  }
  return "conflict";
}

export function connectorMatches(existing, spec) {
  if (!existing || existing.disabled === true) return false;
  return existing.url === spec.url && (!existing.type || existing.type === "http");
}

export function classifyExistingConnector(existing, spec) {
  if (!existing) return "missing";
  if (connectorMatches(existing, spec)) return "current";
  if (existing.url === DEFAULT_HTTP_URL) return "replaceable-http";
  if (Array.isArray(existing.args) && existing.args.some((arg) => resolve(String(arg)) === spec.serverPath)) {
    return "replaceable-stdio";
  }
  return "conflict";
}

export function buildWorkBuddyHandoff(spec) {
  return [
    "下一步（必须手动完成）：",
    "1. 打开 WorkBuddy → 连接器 → 自定义连接。",
    "2. 找到 jewel-buddy，信任新安装的本地 MCP 并开启开关。",
    `3. 核对连接地址：${spec.url}`,
    `4. 托管服务定义：${spec.managedService.servicePath}`,
    `5. 确认 Jewel Buddy Skill 已安装到：${spec.skillTarget}`,
    "6. 首次安装时完全退出并重新打开 WorkBuddy（仅关闭窗口不够），让 Apps UI 目录重新扫描。",
    "7. 运行 npm run doctor:workbuddy；四项都为 ✓ 后新建对话测试。",
    "8. 不要在旧消息中重试，也不要回退到原生对话卡片。",
    "若可视化表单没有出现，请停止当前流程并运行 npm run doctor:workbuddy；不要用普通文本卡片代替。",
  ].join("\n");
}

export function inspectAppsDiagnostic(logText) {
  const lines = String(logText || "").split(/\r?\n/);
  let latestCatalogIndex = -1;
  let latestCatalogLine = "";
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes("catalog.refresh")) continue;
    latestCatalogIndex = index;
    latestCatalogLine = lines[index];
  }
  const catalogReady = [
    "jewel-buddy/ask_grill_me_questions",
    "jewel-buddy/show_jewel_results",
  ].every((appId) => latestCatalogLine.includes(appId));
  const grayScreenDetected = !catalogReady && lines.some((line, index) => (
    index > latestCatalogIndex
      && line.includes("pushToolResult.buffered")
      && /structuredContentKeys[^\n]*interview/.test(line)
  ));
  return { catalogReady, grayScreenDetected, latestCatalogLine };
}

function findOnPath(command) {
  const lookup = platform() === "win32" ? "where" : "which";
  const result = spawnSync(lookup, [command], { encoding: "utf8" });
  if (result.status !== 0) return undefined;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
}

function resolveWorkBuddyCli() {
  const windowsCandidates = platform() === "win32"
    ? [
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Programs", "WorkBuddy", "resources", "app.asar.unpacked", "cli", "bin", "codebuddy.exe"),
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "WorkBuddy", "resources", "app.asar.unpacked", "cli", "bin", "codebuddy.exe"),
        process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "WorkBuddy", "resources", "app.asar.unpacked", "cli", "bin", "codebuddy.exe"),
      ].filter(Boolean)
    : [];
  const candidates = [
    process.env.WORKBUDDY_CLI,
    platform() === "darwin"
      ? "/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/cli/bin/codebuddy"
      : undefined,
    ...windowsCandidates,
    findOnPath("codebuddy"),
  ].filter(Boolean);
  const cli = candidates.find((candidate) => existsSync(candidate));
  if (!cli) {
    throw new Error("找不到 WorkBuddy CLI。请设置 WORKBUDDY_CLI，或确认 WorkBuddy Desktop 已安装。");
  }
  return cli;
}

function readConnector(configDir) {
  const configPath = join(configDir, "mcp.json");
  if (!existsSync(configPath)) return undefined;
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  return config.mcpServers?.[CONNECTOR_NAME];
}

export function restoreConnector(configDir, existing) {
  const configPath = join(configDir, "mcp.json");
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {};
  config.mcpServers ||= {};
  config.mcpServers[CONNECTOR_NAME] = existing;
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function runCli(cli, args, configDir) {
  const result = spawnSync(cli, args, {
    encoding: "utf8",
    env: { ...process.env, CODEBUDDY_CONFIG_DIR: configDir },
    timeout: CLI_TIMEOUT_MS,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error?.code === "ETIMEDOUT") {
    throw new Error("WorkBuddy CLI 45 秒内没有返回。安装器已停止；请确认网络与 WorkBuddy 状态后重试。");
  }
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(output.trim() || `WorkBuddy CLI exited with ${result.status}`);
  return output;
}

function assertRuntime(spec) {
  if (!existsSync(spec.serverPath)) throw new Error(`MCP server 不存在：${spec.serverPath}`);
  if (!existsSync(resolve(spec.skillSource, "SKILL.md"))) throw new Error(`Jewel Buddy Skill 不存在：${spec.skillSource}`);
  const major = Number(process.versions.node.split(".")[0]);
  if (!Number.isInteger(major) || major < 20) throw new Error(`需要 Node.js 20+，当前为 ${process.version}`);
}

function installSkill(spec) {
  const state = classifyExistingSkill(spec);
  if (state === "conflict") {
    throw new Error(
      `已存在另一个用户级 jewel-buddy Skill：${spec.skillTarget}。为避免覆盖用户内容，安装已停止。`,
    );
  }
  if (state !== "current") {
    cpSync(spec.skillSource, spec.skillTarget, { recursive: true, force: true });
  }
  writeFileSync(spec.skillMarker, `${JSON.stringify({ managedBy: "jewel-buddy-workbuddy", version: INSTALLER_VERSION }, null, 2)}\n`);
}

function verifySkill(spec) {
  if (!skillMatches(spec)) {
    throw new Error(`Jewel Buddy Skill 未正确安装：${spec.skillTarget}`);
  }
  return `jewel-buddy Skill: ${spec.skillTarget} - ✓ Installed`;
}

function verifyConnected(cli, spec) {
  const existing = readConnector(spec.configDir);
  if (!connectorMatches(existing, spec)) {
    throw new Error(`jewel-buddy 连接器未指向当前安装：${spec.serverPath}`);
  }
  const output = runCli(cli, ["mcp", "list"], spec.configDir);
  const line = output.split(/\r?\n/).find((entry) => entry.startsWith(`${CONNECTOR_NAME}:`));
  if (!line || !/✓\s*Connected/.test(line)) {
    throw new Error(`Jewel Buddy MCP 未连接成功。WorkBuddy 返回：\n${output.trim()}`);
  }
  return line;
}

function verifyAppsCatalog(spec) {
  if (!existsSync(spec.appsDiagnosticPath)) {
    throw new Error(
      "尚未找到 WorkBuddy Apps UI 目录日志。请完全退出并重新打开 WorkBuddy，然后在连接器 → 自定义连接中信任并开启 jewel-buddy。",
    );
  }
  const diagnostic = inspectAppsDiagnostic(readFileSync(spec.appsDiagnosticPath, "utf8"));
  if (!diagnostic.catalogReady) {
    const symptom = diagnostic.grayScreenDetected ? "已检测到灰屏：工具结果被缓存，但 UI 宿主未创建 iframe。" : "Apps UI 目录尚未载入 Jewel Buddy。";
    throw new Error(
      `${symptom}\n请完全退出并重新打开 WorkBuddy，再到连接器 → 自定义连接中关闭后重新开启 jewel-buddy；随后新建对话测试。`,
    );
  }
  return "Jewel Buddy Apps UI catalog - ✓ Ready";
}

function install(cli, spec) {
  assertRuntime(spec);
  const existing = readConnector(spec.configDir);
  const state = classifyExistingConnector(existing, spec);
  const skillState = classifyExistingSkill(spec);
  if (state === "conflict") {
    throw new Error(
      "已存在另一个名为 jewel-buddy 的连接器，且来源不是本仓库。为避免覆盖用户配置，安装已停止。",
    );
  }
  if (skillState === "conflict") {
    throw new Error(
      `已存在另一个用户级 jewel-buddy Skill：${spec.skillTarget}。为避免覆盖用户内容，安装已停止。`,
    );
  }
  installManagedService(spec.managedService);
  const serviceHealth = verifyManagedService(spec.managedService);
  installSkill(spec);
  if (state !== "current") {
    if (existing) runCli(cli, ["mcp", "remove", CONNECTOR_NAME, "--scope", "user"], spec.configDir);
    try {
      runCli(cli, spec.addArgs, spec.configDir);
    } catch (addError) {
      if (existing) {
        try {
          restoreConnector(spec.configDir, existing);
        } catch (restoreError) {
          throw new Error(`${addError.message}\n旧连接器恢复失败：${restoreError.message}`);
        }
        throw new Error(`${addError.message}\n新连接器添加失败；旧连接器配置已恢复。`);
      }
      throw addError;
    }
  }
  process.stdout.write(`${buildWorkBuddyHandoff(spec)}\n`);
  const health = verifyConnected(cli, spec);
  const skillHealth = verifySkill(spec);
  process.stdout.write(`Jewel Buddy 已注册为 WorkBuddy 用户级托管 HTTP MCP，并安装唯一 Skill。\n${serviceHealth}\n${health}\n${skillHealth}\n`);
  process.stdout.write("本地 MCP 由操作系统自动启动和重启；无需保持终端窗口。\n");
}

function main() {
  const action = process.argv[2] || "install";
  const spec = buildConnectorSpec();
  const cli = resolveWorkBuddyCli();
  if (action === "install") install(cli, spec);
  else if (action === "status") {
    assertRuntime(spec);
    process.stdout.write(`${verifyManagedService(spec.managedService)}\n`);
    process.stdout.write(`${verifyConnected(cli, spec)}\n`);
    process.stdout.write(`${verifySkill(spec)}\n`);
    process.stdout.write(`${verifyAppsCatalog(spec)}\n`);
  }
  else throw new Error(`未知操作：${action}。支持 install 或 status。`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
