import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildConnectorSpec,
  buildWorkBuddyHandoff,
  classifyExistingConnector,
  classifyExistingSkill,
  connectorMatches,
  inspectAppsDiagnostic,
  restoreConnector,
  skillMatches,
} from "../scripts/workbuddy-connector.mjs";
import {
  buildManagedServiceSpec,
  reloadMacLaunchAgent,
  renderManagedService,
} from "../scripts/managed-mcp-service.mjs";

const ROOT = resolve(import.meta.dirname, "..");

test("one-click installer builds a user-scoped HTTP connector backed by a managed service", () => {
  const spec = buildConnectorSpec({
    root: ROOT,
    nodeBinary: "/opt/node/bin/node",
    configDir: "/tmp/workbuddy-profile",
    platformName: "darwin",
    homeDirectory: "/tmp/user-root",
  });

  assert.equal(spec.name, "jewel-buddy");
  assert.equal(spec.transport, "http");
  assert.equal(spec.configDir, "/tmp/workbuddy-profile");
  assert.equal(spec.skillSource, resolve(ROOT, "plugins/jewel-buddy/skills/jewel-buddy"));
  assert.equal(spec.skillTarget, "/tmp/workbuddy-profile/skills/jewel-buddy");
  assert.equal(spec.url, "http://127.0.0.1:39528/mcp");
  assert.equal(spec.managedService.servicePath, "/tmp/user-root/Library/LaunchAgents/dev.yuyou.jewel-buddy.plist");
  assert.deepEqual(spec.managedService.command, [
    "/opt/node/bin/node", resolve(ROOT, "plugins/jewel-buddy/mcp/server.mjs"), "--http", "--port", "39528",
  ]);
  assert.deepEqual(spec.addArgs, [
    "mcp",
    "add",
    "jewel-buddy",
    "http://127.0.0.1:39528/mcp",
    "--scope",
    "user",
    "--transport",
    "http",
  ]);
  assert.doesNotMatch(JSON.stringify(spec), /--stdio/);
});

test("managed service definitions restart the local MCP without a terminal", () => {
  const mac = buildManagedServiceSpec({
    root: ROOT,
    nodeBinary: "/opt/node/bin/node",
    configDir: "/tmp/workbuddy-profile",
    homeDirectory: "/tmp/user-root",
    platformName: "darwin",
    version: "0.3.4",
  });
  const macDefinition = renderManagedService(mac);
  assert.match(macDefinition, /<key>KeepAlive<\/key><true\/>/);
  assert.match(macDefinition, /<key>RunAtLoad<\/key><true\/>/);
  assert.match(macDefinition, /server\.mjs/);
  assert.match(macDefinition, /39528/);

  const windows = buildManagedServiceSpec({
    root: ROOT,
    nodeBinary: "C:\\Node\\node.exe",
    configDir: "C:\\WorkBuddy",
    homeDirectory: "C:\\Users\\tester",
    appData: "C:\\Users\\tester\\AppData\\Roaming",
    platformName: "win32",
    version: "0.3.4",
  });
  assert.match(renderManagedService(windows), /start "" \/min/);
  assert.match(windows.servicePath, /Jewel Buddy MCP\.cmd$/);
});

test("macOS managed service installation retries launchd's transient bootstrap failure", () => {
  const spec = buildManagedServiceSpec({
    root: ROOT,
    nodeBinary: "/opt/node/bin/node",
    configDir: "/tmp/workbuddy-profile",
    homeDirectory: "/tmp/user-root",
    platformName: "darwin",
    version: "0.3.4",
  });
  const calls = [];
  const waits = [];
  let bootstrapAttempts = 0;
  const runCommand = (command, args) => {
    calls.push([command, ...args]);
    if (args[0] === "bootstrap") {
      bootstrapAttempts += 1;
      return bootstrapAttempts < 3
        ? { status: 1, stdout: "", stderr: "Bootstrap failed: 5: Input/output error" }
        : { status: 0, stdout: "", stderr: "" };
    }
    return { status: 0, stdout: "", stderr: "" };
  };

  reloadMacLaunchAgent(spec, { runCommand, waitFor: (milliseconds) => waits.push(milliseconds) });

  assert.equal(bootstrapAttempts, 3);
  assert.deepEqual(waits, [250, 500]);
  assert.deepEqual(calls.at(0).slice(1, 3), ["bootout", `gui/${process.getuid()}/dev.yuyou.jewel-buddy`]);
  assert.deepEqual(calls.at(-1).slice(1), ["kickstart", "-k", `gui/${process.getuid()}/dev.yuyou.jewel-buddy`]);
});

test("macOS managed service installation reports permanent bootstrap failures immediately", () => {
  const spec = buildManagedServiceSpec({
    root: ROOT,
    nodeBinary: "/missing/node",
    configDir: "/tmp/workbuddy-profile",
    homeDirectory: "/tmp/user-root",
    platformName: "darwin",
    version: "0.3.4",
  });
  let bootstrapAttempts = 0;
  const waits = [];
  const runCommand = (_command, args) => {
    if (args[0] === "bootstrap") {
      bootstrapAttempts += 1;
      return { status: 1, stdout: "", stderr: "Invalid property list" };
    }
    return { status: 0, stdout: "", stderr: "" };
  };

  assert.throws(
    () => reloadMacLaunchAgent(spec, { runCommand, waitFor: (milliseconds) => waits.push(milliseconds) }),
    /Invalid property list/,
  );
  assert.equal(bootstrapAttempts, 1);
  assert.deepEqual(waits, []);
});

test("connector rollback restores only jewel-buddy and preserves unrelated MCP entries", (t) => {
  const configDir = mkdtempSync(resolve(tmpdir(), "jewel-buddy-rollback-"));
  t.after(() => rmSync(configDir, { recursive: true, force: true }));
  const configPath = resolve(configDir, "mcp.json");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(configPath, `${JSON.stringify({ mcpServers: { unrelated: { command: "other" } } })}\n`);
  const previous = { url: "http://127.0.0.1:39528/mcp", type: "http" };
  restoreConnector(configDir, previous);
  const restored = JSON.parse(readFileSync(configPath, "utf8"));
  assert.deepEqual(restored.mcpServers.unrelated, { command: "other" });
  assert.deepEqual(restored.mcpServers["jewel-buddy"], previous);
});

test("installer requires explicit WorkBuddy trust and forbids native-card fallback", () => {
  const spec = buildConnectorSpec({
    root: ROOT,
    nodeBinary: "/opt/node/bin/node",
    configDir: "/tmp/workbuddy-profile",
    platformName: "darwin",
    homeDirectory: "/tmp/user-root",
  });
  const handoff = buildWorkBuddyHandoff(spec);
  assert.match(handoff, /连接器 → 自定义连接/);
  assert.match(handoff, /信任新安装的本地 MCP/);
  assert.match(handoff, /不要回退到原生对话卡片/);
  assert.match(handoff, /完全退出并重新打开 WorkBuddy/);
  assert.match(handoff, /托管服务定义/);
  assert.match(handoff, /Jewel Buddy Skill 已安装到/);
  assert.match(handoff, new RegExp(spec.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("doctor distinguishes MCP connectivity from an Apps catalog gray screen", () => {
  const broken = inspectAppsDiagnostic([
    '[2026-09-03T08:44:39.760Z] catalog.refresh scanned=21 acceptedCount=0 liveApps=[] accepted=[]',
    '[2026-09-03T08:45:47.018Z] pushToolResult.buffered toolCallId=x structuredContentKeys:["interview"]',
  ].join("\n"));
  assert.equal(broken.catalogReady, false);
  assert.equal(broken.grayScreenDetected, true);

  const healthy = inspectAppsDiagnostic([
    '[2026-09-03T09:00:00.000Z] catalog.refresh scanned=23 acceptedCount=2 liveApps=["jewel-buddy/ask_grill_me_questions","jewel-buddy/show_jewel_results"]',
    '[2026-09-03T09:00:01.000Z] openHostApp.created appId=jewel-buddy/ask_grill_me_questions',
  ].join("\n"));
  assert.equal(healthy.catalogReady, true);
  assert.equal(healthy.grayScreenDetected, false);
});

test("installer treats an absent user Skill as installable and checks the bundled Skill tree", () => {
  const spec = buildConnectorSpec({
    root: ROOT,
    nodeBinary: "/opt/node/bin/node",
    configDir: "/tmp/workbuddy-profile-that-does-not-exist",
    platformName: "darwin",
    homeDirectory: "/tmp/user-root",
  });
  assert.equal(classifyExistingSkill(spec), "missing");
  assert.equal(skillMatches(spec), false);
});

test("installer is idempotent and replaces its earlier stdio registration", () => {
  const spec = buildConnectorSpec({
    root: ROOT,
    nodeBinary: "/opt/node/bin/node",
    configDir: "/tmp/workbuddy-profile",
    platformName: "darwin",
    homeDirectory: "/tmp/user-root",
  });

  assert.equal(connectorMatches({ type: "http", url: spec.url }, spec), true);
  assert.equal(classifyExistingConnector(undefined, spec), "missing");
  assert.equal(classifyExistingConnector({ command: "node", args: [spec.serverPath, "--stdio"] }, spec), "replaceable-stdio");
  assert.equal(classifyExistingConnector({ command: "python3", args: ["other.py"] }, spec), "conflict");
});

test("public docs expose the branch installer and connector-only handoff", () => {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
  const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
  const install = readFileSync(resolve(ROOT, "INSTALL.md"), "utf8");

  assert.equal(pkg.scripts["install:workbuddy"], "node scripts/workbuddy-connector.mjs install");
  assert.equal(pkg.scripts["doctor:workbuddy"], "node scripts/workbuddy-connector.mjs status");
  for (const content of [readme, install]) {
    assert.match(content, /Teresa1228\/GrillMeJewel/);
    assert.match(content, /codex\/workbuddy-port/);
    assert.match(content, /npm run install:workbuddy/);
    assert.match(content, /MCP|连接器/);
  }
  assert.match(install, /mcp list/);
  assert.match(install, /✓ Connected/);
  assert.match(install, /无需保持终端/);
  assert.match(install, /连接器 → 自定义连接/);
  assert.match(install, /信任/);
  assert.match(install, /不要回退到原生对话卡片/);
  assert.match(install, /Skill/);
  const installer = readFileSync(resolve(ROOT, "scripts/workbuddy-connector.mjs"), "utf8");
  assert.match(installer, /CLI_TIMEOUT_MS = 45_000/);
  assert.match(installer, /ETIMEDOUT/);
});
