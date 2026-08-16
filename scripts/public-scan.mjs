#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignored = new Set(["scripts/public-scan.mjs", "tests/public-release.test.mjs"]);
const forbiddenNames = [/(?:^|\/)(?:\.DS_Store|__pycache__)(?:\/|$)/, /\.pyc$/, /(?:^|\/)\.env(?:\.|$)/, /(?:^|\/)(?:auth|credentials?)\.json$/i, /(?:^|\/)id_(?:rsa|ed25519)(?:\.pub)?$/i];
const forbiddenContent = [
  ["macOS user home", /\/Users\/[A-Za-z0-9._-]+\//],
  ["Windows user home", /[A-Za-z]:\\Users\\[^\\\r\n]+\\/],
  ["Linux user home", /\/home\/[A-Za-z0-9._-]+\//],
  ["private source repository", /SVT-Jewelry(?:DesignPlugins|-Skills-Image-2)/],
  ["unrelated public repository dependency", /JewelryDesignCodex/],
  ["Codex task link", /codex:\/\/threads\//],
  ["GitHub token", /gh[opusr]_[A-Za-z0-9_]{20,}/],
  ["OpenAI-style secret", /sk-[A-Za-z0-9_-]{20,}/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["bearer credential", /Authorization\s*:\s*Bearer\s+[A-Za-z0-9._~+/=-]{12,}/i],
  ["assigned API key", /(?:OPENAI_API_KEY|API_KEY|CLIENT_SECRET)\s*=\s*["']?[^\s"']{12,}/i],
  ["Codex credential file", /\.codex[\\/]auth\.json/],
];

function walk(folder, files = []) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (entry.isFile()) files.push(relative(ROOT, path).replaceAll("\\", "/"));
  }
  return files;
}

function candidates() {
  if (!existsSync(resolve(ROOT, ".git"))) return walk(ROOT);
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: ROOT, encoding: "buffer" });
  return output.toString("utf8").split("\0").filter(Boolean);
}

const findings = [];
if (existsSync(resolve(ROOT, ".git"))) {
  try {
    const identities = execFileSync("git", ["log", "--format=%ae%x00%ce", "--all"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
    for (const identity of identities) for (const email of identity.split("\0")) if (email && !email.endsWith("@users.noreply.github.com")) findings.push({ file: ".git", rule: "public commit email must use GitHub noreply" });
  } catch { findings.push({ file: ".git", rule: "unable to verify public commit identities" }); }
}

const files = candidates();
for (const file of files) {
  const path = resolve(ROOT, file);
  if (!existsSync(path) || !lstatSync(path).isFile()) continue;
  for (const pattern of forbiddenNames) if (pattern.test(file)) findings.push({ file, rule: "forbidden file name" });
  if (ignored.has(file)) continue;
  const content = readFileSync(path).toString("utf8");
  for (const [rule, pattern] of forbiddenContent) if (pattern.test(content)) findings.push({ file, rule });
}

if (findings.length) {
  for (const finding of findings) process.stderr.write(`${finding.file}: ${finding.rule}\n`);
  process.exitCode = 1;
} else process.stdout.write(`Public release scan passed (${files.length} files).\n`);
