import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const SERVER = resolve(ROOT, "plugins/grill-me-jewel/mcp/server.mjs");
const HTML = resolve(ROOT, "plugins/grill-me-jewel/mcp/interview.html");

function transact(messages) {
  const input = `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`;
  const result = spawnSync(process.execPath, [SERVER, "--stdio"], { cwd: ROOT, input, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim().split("\n").filter(Boolean).map(JSON.parse);
}

test("MCP exposes one interview tool and one Apps UI resource", () => {
  const responses = transact([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "resources/list" },
    { jsonrpc: "2.0", id: 4, method: "resources/read", params: { uri: "ui://grill-me-jewel/interview/v3.html" } },
  ]);
  assert.equal(responses[0].result.serverInfo.name, "grill_me_jewel_ui");
  assert.deepEqual(responses[1].result.tools.map(({ name }) => name), ["ask_grill_me_questions"]);
  assert.match(responses[1].result.tools[0].description, /four sequential discovery rounds/);
  assert.match(responses[1].result.tools[0].description, /delivery_count/);
  assert.equal(responses[2].result.resources.length, 1);
  assert.match(responses[3].result.contents[0].mimeType, /profile=mcp-app/);
  assert.equal(responses[3].result.contents[0]._meta.ui.prefersBorder, false);
});

test("interview call preserves stable ids and never puts media in structured content", () => {
  const [response] = transact([{ jsonrpc: "2.0", id: 5, method: "tools/call", params: {
    name: "ask_grill_me_questions", arguments: {
      title: "确定第一轮方向", intro: "先回答两项", round: 1, stage: "foundation",
      questions: [
        { id: "category", label: "珠宝品类", type: "single", options: [{ value: "ring", label: "戒指" }, { value: "other", label: "其他" }] },
        { id: "delivery_count", label: "输出几张", type: "single", options: [{ value: "count_1", label: "1 张" }, { value: "count_4", label: "4 张" }] },
      ],
    },
  }}]);
  assert.equal(response.result.structuredContent.interview.questions[0].id, "category");
  assert.equal(response.result.structuredContent.interview.questions.length, 2);
  assert.equal(response.result.structuredContent.interview.stage, "foundation");
  assert.equal(response.result.structuredContent.interview.minimumDiscoveryRounds, 4);
  assert.doesNotMatch(JSON.stringify(response.result.structuredContent), /base64|data:image/);
});

test("server rejects more than four questions and invalid option ids", () => {
  const questions = Array.from({ length: 5 }, (_, index) => ({ id: `q${index}`, label: `Q${index}`, type: "text" }));
  const [tooMany, badId] = transact([
    { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "ask_grill_me_questions", arguments: { title: "Round", round: 1, stage: "foundation", questions } } },
    { jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "ask_grill_me_questions", arguments: { title: "Round", round: 1, stage: "foundation", questions: [{ id: "Bad ID", label: "Bad", type: "text" }] } } },
  ]);
  assert.match(tooMany.error.message, /1-4/);
  assert.match(badId.error.message, /stable lowercase id/);
});

test("server enforces four ordered discovery stages before confirmation", () => {
  const question = [{ id: "direction", label: "Direction", type: "text" }];
  const [wrongSecond, earlyConfirmation, validConfirmation] = transact([
    { jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "ask_grill_me_questions", arguments: { title: "Round", round: 2, stage: "design_language", questions: question } } },
    { jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "ask_grill_me_questions", arguments: { title: "Round", round: 4, stage: "confirmation", questions: question } } },
    { jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "ask_grill_me_questions", arguments: { title: "Confirm", round: 5, stage: "confirmation", questions: question } } },
  ]);
  assert.match(wrongSecond.error.message, /round 2 must use stage meaning/);
  assert.match(earlyConfirmation.error.message, /round 4 must use stage variation_delivery/);
  assert.equal(validConfirmation.result.structuredContent.interview.stage, "confirmation");
});

test("Apps UI is a single-question wizard with terminal loading and no nested scrolling", () => {
  const html = readFileSync(HTML, "utf8");
  assert.match(html, /ui\/message/);
  assert.match(html, /上一题/);
  assert.match(html, /下一题/);
  assert.match(html, /9\s*000|9000/);
  assert.match(html, /overflow:hidden/);
  assert.doesNotMatch(html, /overflow-y\s*:\s*(?:auto|scroll)/);
  assert.doesNotMatch(html, /type=["']file["']/);
  assert.match(html, /Current widget context \(JSON\)/);
  assert.match(html, /minimumDiscoveryRounds/);
  assert.match(html, /active\.stageLabel/);
  assert.match(html, /schemaVersion:2/);
  assert.match(html, /toolError/);
  assert.match(html, /访谈问题不完整/);
});
