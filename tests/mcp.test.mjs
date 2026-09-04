import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";
import { tmpdir } from "node:os";
import vm from "node:vm";

const ROOT = resolve(import.meta.dirname, "..");
const SERVER = resolve(ROOT, "plugins/jewel-buddy/mcp/server.mjs");
const HTML = resolve(ROOT, "plugins/jewel-buddy/mcp/interview.html");
const SERVER_ID = "jewel-buddy";
const RESOURCE_URI = "ui://jewel-buddy/interview/v5.html";
const RESULTS_URI = "ui://jewel-buddy/results/v5.html";
const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function transact(messages, cwd = ROOT) {
  const input = `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`;
  const result = spawnSync(process.execPath, [SERVER, "--stdio"], { cwd, input, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim().split("\n").filter(Boolean).map(JSON.parse);
}

async function startHttpServer() {
  const child = spawn(process.execPath, [SERVER, "--http", "--port", "0"], {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "pipe"],
  });
  const port = await new Promise((resolvePort, reject) => {
    let stderr = "";
    const timer = setTimeout(() => reject(new Error(`HTTP MCP did not start: ${stderr}`)), 5000);
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      const match = stderr.match(/http:\/\/127\.0\.0\.1:(\d+)\/mcp/);
      if (!match) return;
      clearTimeout(timer);
      resolvePort(Number(match[1]));
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`HTTP MCP exited early with ${code}: ${stderr}`));
    });
  });
  return { child, endpoint: `http://127.0.0.1:${port}` };
}

function extractClass(source, className) {
  const start = source.indexOf(`class ${className}`);
  assert.notEqual(start, -1, `${className} is missing`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${className} is incomplete`);
}

function extractInlineScript(source) {
  const match = source.match(/<script type="module">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, "inline widget script is missing");
  return match[1];
}

test("MCP exposes interview and result tools through versioned Apps UI resources", () => {
  const responses = transact([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "resources/list" },
    { jsonrpc: "2.0", id: 4, method: "resources/read", params: { uri: RESOURCE_URI } },
    { jsonrpc: "2.0", id: 5, method: "resources/templates/list" },
  ]);
  assert.equal(responses[0].result.serverInfo.name, SERVER_ID);
  assert.deepEqual(responses[1].result.tools.map(({ name }) => name), ["ask_grill_me_questions", "show_jewel_results"]);
  assert.match(responses[1].result.tools[0].description, /four sequential discovery rounds/);
  assert.match(responses[1].result.tools[0].description, /delivery_count/);
  assert.match(responses[1].result.tools[0].description, /primary user-facing response/i);
  assert.match(responses[1].result.tools[0].description, /never from reasoning or analysis/i);
  assert.match(responses[1].result.tools[0].description, /end the turn/i);
  assert.match(responses[1].result.tools[1].description, /draggable before\/after comparison/);
  assert.match(responses[1].result.tools[1].description, /final result UI/i);
  assert.match(responses[1].result.tools[1].description, /never from reasoning or analysis/i);
  assert.match(responses[1].result.tools[1].description, /never.*in parallel.*image generation/i);
  assert.match(responses[1].result.tools[1].description, /native image or file presentation.*before this tool/is);
  assert.deepEqual(responses[1].result.tools[1].inputSchema.properties.items.items.anyOf, [
    { required: ["result_path"] },
    { required: ["result_data_uri"] },
  ]);
  assert.equal(responses[2].result.resources.length, 2);
  assert.equal(responses[1].result.tools[0]._meta.ui.resourceUri, RESOURCE_URI);
  assert.equal(responses[1].result.tools[0]._meta.ui.launchSurface, "inline");
  assert.deepEqual(responses[1].result.tools[0]._meta.ui, {
    resourceUri: RESOURCE_URI,
    launchSurface: "inline",
  });
  assert.deepEqual(Object.keys(responses[1].result.tools[0]._meta), ["ui"]);
  assert.equal(responses[1].result.tools[0]._meta["openai/outputTemplate"], undefined);
  assert.deepEqual(responses[1].result.tools[1]._meta.ui, {
    resourceUri: RESULTS_URI,
    launchSurface: "inline",
  });
  assert.equal(responses[2].result.resources[0].uri, RESOURCE_URI);
  assert.equal(responses[2].result.resources[1].uri, RESULTS_URI);
  assert.match(responses[3].result.contents[0].mimeType, /profile=mcp-app/);
  assert.ok(Buffer.byteLength(responses[3].result.contents[0].text) < 256 * 1024);
  assert.deepEqual(responses[3].result.contents[0]._meta.ui.csp, {});
  assert.deepEqual(responses[3].result.contents[0]._meta.ui.permissions, {});
  assert.equal(responses[3].result.contents[0]._meta.ui.prefersBorder, false);
  assert.deepEqual(responses[4].result.resourceTemplates, []);
});

test("result tool presents real images without leaking local paths", () => {
  const [textToImage, imageToImage] = transact([
    { jsonrpc: "2.0", id: 31, method: "tools/call", params: { name: "show_jewel_results", arguments: {
      title: "吊坠设计结果", mode: "text_to_image", items: [
        { id: "infinity_pendant", title: "无限结吊坠", caption: "18K 金与温润弧线", result_data_uri: TINY_PNG },
      ],
    } } },
    { jsonrpc: "2.0", id: 32, method: "tools/call", params: { name: "show_jewel_results", arguments: {
      title: "吊坠改款对比", mode: "image_to_image", items: [
        { id: "softened_curve", title: "柔化曲线", source_data_uri: TINY_PNG, result_data_uri: TINY_PNG },
      ],
    } } },
  ]);

  assert.deepEqual(textToImage.result.content.map(({ type }) => type), ["text", "image"]);
  assert.equal(textToImage.result.content[1].mimeType, "image/png");
  assert.match(textToImage.result.structuredContent.gallery.items[0].resultDataUri, /^data:image\/png;base64,/);
  assert.doesNotMatch(JSON.stringify(textToImage.result.structuredContent), /result_path|source_path/);
  assert.deepEqual(imageToImage.result.content.map(({ type }) => type), ["text", "image", "image"]);
  assert.equal(imageToImage.result.structuredContent.gallery.items[0].sourceContentIndex, 1);
  assert.equal(imageToImage.result.structuredContent.gallery.items[0].resultContentIndex, 2);
  assert.match(imageToImage.result.structuredContent.gallery.items[0].sourceDataUri, /^data:image\/png;base64,/);
  assert.match(imageToImage.result.structuredContent.gallery.items[0].resultDataUri, /^data:image\/png;base64,/);
  assert.equal(imageToImage.result._meta.ui.resourceUri, RESULTS_URI);
});

test("result gallery survives WorkBuddy structuredContent-only iframe delivery", () => {
  const [response] = transact([
    { jsonrpc: "2.0", id: 37, method: "tools/call", params: { name: "show_jewel_results", arguments: {
      title: "可见的吊坠设计", mode: "text_to_image", items: [
        { id: "visible_pendant", title: "可见吊坠", result_data_uri: TINY_PNG },
      ],
    } } },
  ]);

  // WorkBuddy currently delivers structuredContent to the Apps iframe but omits content image blocks.
  const deliveredToIframe = { structuredContent: response.result.structuredContent };
  const item = deliveredToIframe.structuredContent.gallery.items[0];
  assert.match(item.resultDataUri, /^data:image\/png;base64,/);
});

test("result tool rejects incomplete comparisons, unsafe paths, and false MIME claims", (t) => {
  const cleanWorkspace = mkdtempSync(join(tmpdir(), "jewel-buddy-test-"));
  t.after(() => rmSync(cleanWorkspace, { recursive: true, force: true }));
  const [missingSource, relativePath, outsideOutput, falseMime] = transact([
    { jsonrpc: "2.0", id: 33, method: "tools/call", params: { name: "show_jewel_results", arguments: {
      title: "缺失原图", mode: "image_to_image", items: [
        { id: "missing_source", title: "缺失原图", result_data_uri: TINY_PNG },
      ],
    } } },
    { jsonrpc: "2.0", id: 34, method: "tools/call", params: { name: "show_jewel_results", arguments: {
      title: "相对路径", mode: "text_to_image", items: [
        { id: "relative_path", title: "相对路径", result_path: "generated.png" },
      ],
    } } },
    { jsonrpc: "2.0", id: 35, method: "tools/call", params: { name: "show_jewel_results", arguments: {
      title: "输出目录外", mode: "text_to_image", items: [
        { id: "outside_output", title: "输出目录外", result_path: resolve(ROOT, "plugins/jewel-buddy/assets/brand/logo-header.webp") },
      ],
    } } },
    { jsonrpc: "2.0", id: 36, method: "tools/call", params: { name: "show_jewel_results", arguments: {
      title: "伪造类型", mode: "text_to_image", items: [
        { id: "false_mime", title: "伪造类型", result_data_uri: TINY_PNG.replace("image/png", "image/jpeg") },
      ],
    } } },
  ], cleanWorkspace);
  assert.match(missingSource.error.message, /source_path or source_data_uri/);
  assert.match(relativePath.error.message, /must be absolute/);
  assert.match(outsideOutput.error.message, /generated-images directory/);
  assert.match(falseMime.error.message, /MIME type does not match/);
});

test("WorkBuddy can inspect the same MCP App over Streamable HTTP", async (t) => {
  const { child, endpoint } = await startHttpServer();
  t.after(() => child.kill());

  const health = await fetch(`${endpoint}/health`).then((response) => response.json());
  assert.deepEqual(health, { ok: true, name: SERVER_ID, version: "0.3.4" });

  const post = (message) => fetch(`${endpoint}/mcp`, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2025-11-25",
    },
    body: JSON.stringify(message),
  });
  const response = await post({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  const payload = await response.json();
  assert.equal(payload.result.serverInfo.name, SERVER_ID);

  const initialized = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
  assert.equal(initialized.status, 202);
  const tools = await post({ jsonrpc: "2.0", id: 2, method: "tools/list" }).then((item) => item.json());
  const resources = await post({ jsonrpc: "2.0", id: 3, method: "resources/list" }).then((item) => item.json());
  const view = await post({ jsonrpc: "2.0", id: 4, method: "resources/read", params: { uri: RESOURCE_URI } }).then((item) => item.json());
  assert.equal(tools.result.tools[0]._meta.ui.resourceUri, RESOURCE_URI);
  assert.equal(resources.result.resources[0].uri, RESOURCE_URI);
  assert.match(view.result.contents[0].mimeType, /profile=mcp-app/);
  assert.match(view.result.contents[0].text, /正在载入访谈问题/);

  const doctor = spawnSync(process.execPath, [
    SERVER, "--inspect", `${endpoint}/mcp`, "--expect-version", "0.3.4",
  ], { cwd: ROOT, encoding: "utf8" });
  assert.equal(doctor.status, 0, doctor.stderr);
  assert.match(doctor.stdout, /"tools":2/);
  assert.match(doctor.stdout, /"resources":2/);
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
  assert.equal(response.result._meta.ui.resourceUri, RESOURCE_URI);
  assert.equal(response.result._meta.ui.launchSurface, "inline");
  assert.deepEqual(Object.keys(response.result._meta), ["ui"]);
  assert.equal(response.result.content[0].type, "text");
  assert.match(response.result.content[0].text, /end this turn/);
  assert.doesNotMatch(response.result.content[0].text, /第 \d+ 轮|问题|选项/);
  assert.doesNotMatch(JSON.stringify(response.result.structuredContent), /base64|data:image/);
});

test("interview requires option values to begin with a lowercase letter", () => {
  const [listed, response, invalid] = transact([
    { jsonrpc: "2.0", id: 51, method: "tools/list" },
    { jsonrpc: "2.0", id: 52, method: "tools/call", params: {
      name: "ask_grill_me_questions", arguments: {
        title: "选择材质", round: 1, stage: "foundation",
        questions: [{
          id: "material", label: "主要材质", type: "single", options: [
            { value: "gold_18k", label: "18K 金" },
            { value: "platinum", label: "铂金" },
          ],
        }],
      },
    } },
    { jsonrpc: "2.0", id: 53, method: "tools/call", params: {
      name: "ask_grill_me_questions", arguments: {
        title: "选择材质", round: 1, stage: "foundation",
        questions: [{
          id: "material", label: "主要材质", type: "single", options: [
            { value: "18k_gold", label: "18K 金" },
            { value: "platinum", label: "铂金" },
          ],
        }],
      },
    } },
  ]);
  const optionPattern = listed.result.tools[0].inputSchema.properties.questions.items
    .properties.options.items.properties.value.pattern;
  assert.doesNotMatch("18k_gold", new RegExp(optionPattern));
  assert.match("gold_18k", new RegExp(optionPattern));
  assert.equal(response.error, undefined);
  assert.equal(response.result.structuredContent.interview.questions[0].options[0].value, "gold_18k");
  assert.match(invalid.error.message, /must start with a lowercase letter/);
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

test("skill keeps optional confirmation notes optional", () => {
  const skill = readFileSync(resolve(ROOT, "plugins/jewel-buddy/skills/jewel-buddy/SKILL.md"), "utf8");
  assert.match(skill, /required: false/);
  assert.match(skill, /correction field/);
});

test("Apps UI feeds widget actions to the WorkBuddy conversation", () => {
  const html = readFileSync(HTML, "utf8");
  assert.match(html, /<style>/);
  assert.match(html, /正在载入访谈问题/);
  assert.match(html, /class WorkBuddyBridge/);
  assert.match(html, /new WorkBuddyBridge\(/);
  assert.match(html, /request\("ui\/update-model-context",params\)/);
  assert.match(html, /request\("ui\/message",params\)/);
  assert.match(html, /app\.sendMessage\(/);
  assert.match(html, /await app\.updateModelContext\(/);
  assert.match(html, /codebuddy\.ai\/sendMessageMode/);
  assert.match(html, /submitting/);
  assert.match(html, /otherText=\{\};submitting=false;render\(\)/);
  assert.match(html, /请直接展示下一轮表单/);
  assert.match(html, /请按已确认 brief 生成并展示结果/);
  assert.doesNotMatch(html, /Current widget context \(JSON\)/);
  assert.doesNotMatch(html, /const summary=/);
  assert.match(html, /messageResult\?\.isError/);
  assert.match(html, /parseGallery/);
  assert.match(html, /renderGallery/);
  assert.match(html, /拖动比较原图和生成图/);
  assert.match(html, /contentImage/);
  assert.match(html, /galleryImage/);
  assert.match(html, /\$\{prefix\}DataUri/);
  assert.match(html, /\$\{prefix\}ContentIndex/);
  assert.doesNotMatch(html, /esm\.sh/);
  assert.doesNotMatch(html, /https?:\/\/|127\.0\.0\.1|__SDK_BASE__|<script[^>]+src=|<link[^>]+href=/);
  assert.doesNotMatch(html, /event\.source\s*!==\s*window\.parent/);
  assert.doesNotMatch(html, /window\.openai|openai\/outputTemplate/);
});

test("Apps UI preserves the upstream Codex visual language and question cards", () => {
  const html = readFileSync(HTML, "utf8");
  assert.match(html, /<title>Grill Me 珠宝<\/title>/);
  assert.match(html, /<div class="mark">GMJ<\/div>/);
  assert.match(html, /Suwa Technology · Grill Me Jewel · Round \$\{active\.round\}/);
  assert.match(html, /aria-label="\$\{escapeHtml\(active\.stageLabel\)\} · 第 \$\{active\.round\} 轮"/);
  assert.doesNotMatch(html, /<div class="eyebrow">WorkBuddy/);
  assert.match(html, /<div class="progress">\$\{index\+1\} \/ \$\{active\.questions\.length\}<\/div>/);
  assert.doesNotMatch(html, /<div class="progress">\$\{roundProgress\}/);
  assert.match(html, /--ink:#151515/);
  assert.match(html, /--muted:#707070/);
  assert.match(html, /--gold:#b88a35/);
  assert.match(html, /\.app\{max-width:920px/);
  assert.match(html, /\.options\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(html, /@media\(max-width:620px\).*\.options\{grid-template-columns:1fr\}/s);
  assert.match(html, /option input:focus-visible\+span/);
  assert.match(html, /<small>\$\{escapeHtml\(o\.description\)\}<\/small>/);
  assert.match(html, /background:transparent/);
});

test("result cards fit WorkBuddy height limits without hiding metadata or controls", () => {
  const html = readFileSync(HTML, "utf8");
  assert.match(html, /\.visual\{[^}]*max-height:400px/);
  assert.match(html, /\.result-stage\.has-navigation \.visual\{max-height:380px\}/);
  assert.match(html, /const hasMultiple=gallery\.items\.length>1/);
  assert.match(html, /hasMultiple\?`<nav class="gallery-nav"/);
  assert.match(html, /getElementById\("previousResult"\)\?\./);
  assert.match(html, /getElementById\("nextResult"\)\?\./);
});

test("server keeps the upstream Codex default interview title", () => {
  const [response] = transact([{ jsonrpc: "2.0", id: 11, method: "tools/call", params: {
    name: "ask_grill_me_questions", arguments: {
      round: 1,
      stage: "foundation",
      questions: [{ id: "category", label: "先确定珠宝品类", type: "text" }],
    },
  } }]);
  assert.equal(response.result.structuredContent.interview.title, "Grill Me 珠宝");
});

test("Apps UI sends WorkBuddy message metadata inside ui/message params", () => {
  const html = readFileSync(HTML, "utf8");
  const posted = [];
  const parent = { postMessage(message) { posted.push(message); } };
  const window = { parent, addEventListener() {} };
  const source = extractClass(html, "WorkBuddyBridge")
    .replace("class WorkBuddyBridge", "globalThis.WorkBuddyBridge=class WorkBuddyBridge");
  const context = vm.createContext({ window, setTimeout: () => 1, clearTimeout() {} });
  vm.runInContext(source, context);
  const bridge = new context.WorkBuddyBridge({ name: "test", version: "1" });

  void bridge.sendMessage({
    role: "user",
    content: [{ type: "text", text: "继续生成图片" }],
    _meta: { "codebuddy.ai/sendMessageMode": "send" },
  });

  assert.equal(posted.length, 1);
  assert.equal(posted[0].method, "ui/message");
  assert.equal(posted[0]._meta, undefined);
  assert.equal(posted[0].params._meta["codebuddy.ai/sendMessageMode"], "send");

  void bridge.updateModelContext({
    content: [{ type: "text", text: "hidden state" }],
    structuredContent: { round: 1 },
  });
  assert.equal(posted[1].method, "ui/update-model-context");
  assert.equal(posted[1].params.content[0].text, "hidden state");
  assert.equal(posted[1].params.structuredContent.round, 1);
});

test("confirmation handoff orders native image presentation before the result UI", () => {
  const html = readFileSync(HTML, "utf8");
  assert.match(html, /等待全部图片成功后先在主对话展示图片，再调用 show_jewel_results/);
});

test("result UI waits for tool-result image data instead of rendering path-only tool input", () => {
  const html = readFileSync(HTML, "utf8");
  let receiveMessage;
  const root = { innerHTML: '<section class="loading"><div>正在载入访谈问题…</div></section>' };
  const document = {
    getElementById(id) { return id === "app" ? root : null; },
    body: { scrollWidth: 800, scrollHeight: 360 },
    documentElement: { scrollWidth: 800, scrollHeight: 360, style: {} },
  };
  const window = {
    parent: { postMessage() {} },
    innerWidth: 800,
    addEventListener(type, listener) { if (type === "message") receiveMessage = listener; },
  };
  let timeoutCallback;
  const context = vm.createContext({
    window,
    document,
    CSS: { escape: (value) => value },
    setTimeout(callback) { timeoutCallback = callback; return 1; },
    clearTimeout() {},
    requestAnimationFrame(callback) { callback(); },
    ResizeObserver: class { observe() {} },
  });
  vm.runInContext(extractInlineScript(html), context);

  receiveMessage({ data: {
    jsonrpc: "2.0",
    method: "ui/notifications/tool-input",
    params: { arguments: {
      title: "待完成结果",
      mode: "text_to_image",
      items: [{ id: "result_one", title: "结果一", result_path: "/tmp/not-ready.png" }],
    } },
  } });

  assert.doesNotMatch(root.innerHTML, /图片结果不完整/);
  assert.match(root.innerHTML, /等待图片数据/);
  timeoutCallback();
  assert.match(root.innerHTML, /等待图片数据/);

  receiveMessage({ data: {
    jsonrpc: "2.0",
    method: "ui/notifications/tool-result",
    params: { structuredContent: { gallery: {
      title: "完整结果",
      mode: "text_to_image",
      items: [{ id: "result_one", title: "结果一", resultDataUri: TINY_PNG }],
    } }, content: [] },
  } });

  assert.doesNotMatch(root.innerHTML, /等待图片数据|图片结果不完整/);
  assert.match(root.innerHTML, /data:image\/png;base64/);
});

test("Apps UI accepts WorkBuddy preload messages without a trusted event source", async () => {
  const html = readFileSync(HTML, "utf8");
  const posted = [];
  let receiveMessage;
  const parent = { postMessage(message) { posted.push(message); } };
  const window = {
    parent,
    innerWidth: 640,
    addEventListener(type, listener) {
      if (type === "message") receiveMessage = listener;
    },
  };
  const document = {
    body: {
      scrollWidth: 900,
      scrollHeight: 880,
    },
    documentElement: {
      scrollWidth: 870,
      scrollHeight: 870,
      getBoundingClientRect: () => ({ height: 600 }),
    },
  };
  const source = extractClass(html, "WorkBuddyBridge")
    .replace("class WorkBuddyBridge", "globalThis.WorkBuddyBridge=class WorkBuddyBridge");
  const context = vm.createContext({ window, document, setTimeout: () => 1, clearTimeout() {} });
  vm.runInContext(source, context);
  const bridge = new context.WorkBuddyBridge({ name: "test", version: "1" });

  const connecting = bridge.connect();
  assert.equal(posted[0].method, "ui/initialize");
  assert.deepEqual(Array.from(posted[0].params.appCapabilities.availableDisplayModes), ["inline", "fullscreen"]);

  receiveMessage({
    source: { not: "window.parent" },
    data: {
      jsonrpc: "2.0",
      id: posted[0].id,
      result: { protocolVersion: "2026-01-26", hostContext: { theme: "light" } },
    },
  });
  await connecting;
  assert.equal(posted[1].method, "ui/notifications/initialized");

  bridge.reportSize();
  assert.equal(posted[2].method, "ui/notifications/size-changed");
  assert.deepEqual({ ...posted[2].params }, { width: 900, height: 880 });
});

test("Apps UI remains a single-question wizard with terminal loading and no nested scrolling", () => {
  const html = readFileSync(HTML, "utf8");
  assert.match(html, /上一题/);
  assert.match(html, /下一题/);
  assert.match(html, /9\s*000|9000/);
  assert.match(html, /overflow:hidden/);
  assert.doesNotMatch(html, /overflow-y\s*:\s*(?:auto|scroll)/);
  assert.doesNotMatch(html, /type=["']file["']/);
  assert.match(html, /minimumDiscoveryRounds/);
  assert.match(html, /active\.stageLabel/);
  assert.match(html, /schemaVersion:2/);
  assert.match(html, /toolError/);
  assert.match(html, /访谈问题不完整/);
});
