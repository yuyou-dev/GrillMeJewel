import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const SERVICE_LABEL = "dev.yuyou.jewel-buddy";

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function quoteWindows(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function quoteSystemd(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function buildManagedServiceSpec({
  root,
  nodeBinary,
  configDir,
  homeDirectory,
  platformName,
  port = 39528,
  version,
  appData = process.env.APPDATA,
} = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("JEWEL_BUDDY_HTTP_PORT 必须是 1024 到 65535 之间的整数。");
  }
  const serverPath = resolve(root, "plugins/jewel-buddy/mcp/server.mjs");
  const logDir = resolve(configDir, "logs");
  const endpoint = `http://127.0.0.1:${port}/mcp`;
  let servicePath;
  if (platformName === "darwin") {
    servicePath = resolve(homeDirectory, "Library/LaunchAgents", `${SERVICE_LABEL}.plist`);
  } else if (platformName === "win32") {
    const startup = appData
      ? resolve(appData, "Microsoft/Windows/Start Menu/Programs/Startup")
      : resolve(configDir, "startup");
    servicePath = resolve(startup, "Jewel Buddy MCP.cmd");
  } else {
    servicePath = resolve(homeDirectory, ".config/systemd/user", `${SERVICE_LABEL}.service`);
  }
  return {
    platformName,
    nodeBinary,
    serverPath,
    logDir,
    servicePath,
    serviceLabel: SERVICE_LABEL,
    port,
    endpoint,
    healthUrl: `http://127.0.0.1:${port}/health`,
    version,
    command: [nodeBinary, serverPath, "--http", "--port", String(port)],
  };
}

export function renderManagedService(spec) {
  const [nodeBinary, serverPath, , , port] = spec.command;
  const stdoutPath = resolve(spec.logDir, "jewel-buddy-service.log");
  const stderrPath = resolve(spec.logDir, "jewel-buddy-service-error.log");
  if (spec.platformName === "darwin") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${escapeXml(spec.serviceLabel)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(nodeBinary)}</string>
    <string>${escapeXml(serverPath)}</string>
    <string>--http</string>
    <string>--port</string>
    <string>${escapeXml(port)}</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>3</integer>
  <key>StandardOutPath</key><string>${escapeXml(stdoutPath)}</string>
  <key>StandardErrorPath</key><string>${escapeXml(stderrPath)}</string>
</dict>
</plist>
`;
  }
  if (spec.platformName === "win32") {
    return `@echo off\r\nstart "" /min ${quoteWindows(nodeBinary)} ${quoteWindows(serverPath)} --http --port ${port}\r\n`;
  }
  return `[Unit]
Description=Jewel Buddy local MCP Apps server
After=network.target

[Service]
ExecStart=${spec.command.map(quoteSystemd).join(" ")}
Restart=always
RestartSec=3
StandardOutput=append:${stdoutPath}
StandardError=append:${stderrPath}

[Install]
WantedBy=default.target
`;
}

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 15_000 });
  if (result.error) {
    if (allowFailure) return result;
    throw result.error;
  }
  if (result.status !== 0 && !allowFailure) {
    const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
    throw new Error(output || `${command} exited with ${result.status}`);
  }
  return result;
}

function wait(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function commandOutput(result) {
  return `${result?.stdout || ""}${result?.stderr || ""}${result?.error?.message || ""}`.trim();
}

function isTransientLaunchdRemoval(result) {
  return /Input\/output error|Operation already in progress/i.test(commandOutput(result));
}

export function reloadMacLaunchAgent(spec, {
  runCommand = run,
  waitFor = wait,
  attempts = 6,
} = {}) {
  if (typeof process.getuid !== "function") throw new Error("无法确定当前 macOS 用户 id。");
  const domain = `gui/${process.getuid()}`;
  const target = `${domain}/${spec.serviceLabel}`;
  runCommand("launchctl", ["bootout", target], { allowFailure: true });

  let bootstrap;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    bootstrap = runCommand("launchctl", ["bootstrap", domain, spec.servicePath], { allowFailure: true });
    if (!bootstrap.error && bootstrap.status === 0) {
      runCommand("launchctl", ["kickstart", "-k", target]);
      return;
    }
    if (!isTransientLaunchdRemoval(bootstrap)) {
      throw bootstrap.error || new Error(commandOutput(bootstrap) || "launchctl bootstrap failed");
    }
    if (attempt < attempts - 1) waitFor(250 * (attempt + 1));
  }

  const output = commandOutput(bootstrap);
  throw bootstrap?.error || new Error(output || "launchctl bootstrap failed");
}

export function installManagedService(spec) {
  mkdirSync(spec.logDir, { recursive: true });
  mkdirSync(dirname(spec.servicePath), { recursive: true });
  writeFileSync(spec.servicePath, renderManagedService(spec), { mode: 0o700 });
  if (spec.platformName !== "win32") chmodSync(spec.servicePath, 0o644);

  if (spec.platformName === "darwin") {
    reloadMacLaunchAgent(spec);
  } else if (spec.platformName === "win32") {
    run("cmd.exe", ["/d", "/s", "/c", spec.servicePath]);
  } else {
    run("systemctl", ["--user", "daemon-reload"]);
    run("systemctl", ["--user", "enable", "--now", spec.serviceLabel]);
  }
}

export function verifyManagedService(spec) {
  if (!existsSync(spec.servicePath)) {
    throw new Error(`Jewel Buddy 托管服务未安装：${spec.servicePath}`);
  }
  let lastResult;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    lastResult = run(process.execPath, [
      spec.serverPath,
      "--inspect",
      spec.endpoint,
      "--expect-version",
      spec.version,
    ], { allowFailure: true });
    if (lastResult.status === 0) {
      return `Jewel Buddy managed MCP: ${spec.endpoint} - ✓ Healthy (2/2 tools, 2 resources)`;
    }
    wait(250);
  }
  const output = `${lastResult?.stdout || ""}${lastResult?.stderr || ""}`.trim();
  throw new Error(
    `Jewel Buddy 托管 MCP 未启动：${spec.endpoint}${output ? `\n${output}` : ""}`,
  );
}
