#!/usr/bin/env node

import { readFileSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const SERVER_NAME = "jewel-buddy";
const SERVER_VERSION = "0.3.4";
const MCP_VERSION = "2025-11-25";
const RESOURCE_URI = "ui://jewel-buddy/interview/v5.html";
const RESULTS_URI = "ui://jewel-buddy/results/v5.html";
const HTML_PATH = fileURLToPath(new URL("./interview.html", import.meta.url));
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
// WorkBuddy forwards structuredContent, but not image content blocks, to the Apps iframe.
// The image is intentionally present in both protocol fields, so keep the total Base64 JSON bounded.
const MAX_GALLERY_BYTES = 1536 * 1024;
const IMAGE_DATA_URI = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/;

const toolUiMeta = (resourceUri = RESOURCE_URI) => ({
  ui: {
    resourceUri,
    launchSurface: "inline",
  },
});

const DISCOVERY_STAGES = ["foundation", "meaning", "design_language", "variation_delivery"];
const STAGE_LABELS = {
  foundation: "设计基础",
  meaning: "情感与母题",
  design_language: "设计语言",
  variation_delivery: "差异与交付",
  deepening: "深入收敛",
  confirmation: "Brief 确认",
};

function error(code, message, data) {
  return { code, message, ...(data === undefined ? {} : { data }) };
}

function text(value, label, max) {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error(`${label} must contain 1-${max} characters`);
  return normalized;
}

function optionalText(value, label, max) {
  if (value === undefined || value === null || value === "") return "";
  return text(value, label, max);
}

function stableId(value, label) {
  const id = text(value, label, 48);
  if (!/^[a-z][a-z0-9_-]*$/.test(id)) throw new Error(`${label} must be a stable lowercase id`);
  return id;
}

function stableOptionValue(value, label) {
  const id = text(value, label, 48);
  if (!/^[a-z][a-z0-9_-]*$/.test(id)) {
    throw new Error(`${label} must start with a lowercase letter and contain only lowercase letters, digits, underscores, or hyphens`);
  }
  return id;
}

function normalizeOption(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`option ${index + 1} must be an object`);
  return {
    value: stableOptionValue(raw.value, `option ${index + 1} value`),
    label: text(raw.label, `option ${index + 1} label`, 60),
    description: optionalText(raw.description, `option ${index + 1} description`, 120),
  };
}

function normalizeQuestion(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`question ${index + 1} must be an object`);
  const type = raw.type || "single";
  if (!new Set(["text", "single", "multi"]).has(type)) throw new Error(`question ${index + 1} has an unsupported type`);
  const question = {
    id: stableId(raw.id, `question ${index + 1} id`),
    label: text(raw.label, `question ${index + 1} label`, 100),
    help: optionalText(raw.help, `question ${index + 1} help`, 180),
    type,
    required: raw.required !== false,
    placeholder: optionalText(raw.placeholder, `question ${index + 1} placeholder`, 120),
    options: [],
  };
  if (type !== "text") {
    if (!Array.isArray(raw.options) || raw.options.length < 2 || raw.options.length > 8) {
      throw new Error(`question ${index + 1} must have 2-8 options`);
    }
    question.options = raw.options.map(normalizeOption);
    if (new Set(question.options.map(({ value }) => value)).size !== question.options.length) {
      throw new Error(`question ${index + 1} has duplicate option values`);
    }
  }
  return question;
}

function normalizeInterview(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("arguments must be an object");
  if (!Array.isArray(args.questions) || args.questions.length < 1 || args.questions.length > 4) {
    throw new Error("questions must contain 1-4 items");
  }
  const questions = args.questions.map(normalizeQuestion);
  if (new Set(questions.map(({ id }) => id)).size !== questions.length) throw new Error("question ids must be unique");
  const round = args.round === undefined ? 1 : Number(args.round);
  if (!Number.isInteger(round) || round < 1 || round > 12) throw new Error("round must be an integer from 1 to 12");
  const stage = text(args.stage, "stage", 30);
  if (!Object.hasOwn(STAGE_LABELS, stage)) throw new Error("stage is unsupported");
  if (round <= 4 && stage !== DISCOVERY_STAGES[round - 1]) {
    throw new Error(`round ${round} must use stage ${DISCOVERY_STAGES[round - 1]}`);
  }
  if (round > 4 && !new Set(["deepening", "confirmation"]).has(stage)) {
    throw new Error("rounds after four must use deepening or confirmation");
  }
  return {
    schemaVersion: 2,
    title: text(args.title || "Grill Me 珠宝", "title", 80),
    intro: optionalText(args.intro, "intro", 240),
    round,
    stage,
    stageLabel: STAGE_LABELS[stage],
    minimumDiscoveryRounds: 4,
    submitLabel: optionalText(args.submitLabel, "submitLabel", 30) || "提交本轮回答",
    questions,
  };
}

function interviewToolDescriptor() {
  return {
    name: "ask_grill_me_questions",
    description: "Present one Grill Me Jewel interview round as the primary user-facing response in WorkBuddy. Call it first, with no prose preamble, from a normal visible assistant response; never from reasoning or analysis. Complete foundation, meaning, design_language, and variation_delivery as four sequential discovery rounds before a separate confirmation round. Ask 1-4 unresolved questions per round, collect delivery_count once when absent, and set required:false for optional fields. After this tool succeeds, end the turn without repeating questions, options, answers, progress, or the roadmap.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "round", "stage", "questions"],
      properties: {
        title: { type: "string", minLength: 1, maxLength: 80 },
        intro: { type: "string", maxLength: 240 },
        round: { type: "integer", minimum: 1, maximum: 12 },
        stage: { type: "string", enum: [...DISCOVERY_STAGES, "deepening", "confirmation"] },
        submitLabel: { type: "string", maxLength: 30 },
        questions: {
          type: "array", minItems: 1, maxItems: 4,
          items: {
            type: "object", additionalProperties: false, required: ["id", "label", "type"],
            properties: {
              id: { type: "string", pattern: "^[a-z][a-z0-9_-]{0,47}$" },
              label: { type: "string", minLength: 1, maxLength: 100 },
              help: { type: "string", maxLength: 180 },
              type: { type: "string", enum: ["text", "single", "multi"] },
              required: { type: "boolean" },
              placeholder: { type: "string", maxLength: 120 },
              options: {
                type: "array", minItems: 2, maxItems: 8,
                items: {
                  type: "object", additionalProperties: false, required: ["value", "label"],
                  properties: {
                    value: { type: "string", pattern: "^[a-z][a-z0-9_-]{0,47}$" },
                    label: { type: "string", minLength: 1, maxLength: 60 },
                    description: { type: "string", maxLength: 120 },
                  },
                },
              },
            },
          },
        },
      },
    },
    outputSchema: {
      type: "object", required: ["interview"],
      properties: { interview: { type: "object" } },
    },
    _meta: toolUiMeta(),
  };
}

function imageInputSchema(prefix) {
  return {
    [`${prefix}_path`]: {
      type: "string",
      description: "Absolute path returned by the image-generation tool. PNG, JPEG, or WebP only.",
    },
    [`${prefix}_data_uri`]: {
      type: "string",
      description: "Fallback data:image/png|jpeg|webp;base64 URI when no local path was returned.",
    },
  };
}

function resultToolDescriptor() {
  return {
    name: "show_jewel_results",
    description: "Render completed jewelry images in the final result UI. Never call this tool in parallel with image generation, in the same tool-call batch, while generation is queued or pending, or before every requested image tool call has returned successfully with a real path or data URI. WorkBuddy's native image or file presentation must also finish successfully before this tool is called, so users see the images first and this UI second. Invoke it from a normal visible assistant response, never from reasoning or analysis. Use text_to_image for generated results alone, or image_to_image with both source and result for a draggable before/after comparison. After this tool succeeds, end the turn without duplicating the gallery, images, or brief. This tool only reads and presents images; it does not generate, upload, or store them.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "mode", "items"],
      properties: {
        title: { type: "string", minLength: 1, maxLength: 80 },
        mode: { type: "string", enum: ["text_to_image", "image_to_image"] },
        items: {
          type: "array", minItems: 1, maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "title"],
            anyOf: [
              { required: ["result_path"] },
              { required: ["result_data_uri"] },
            ],
            properties: {
              id: { type: "string", pattern: "^[a-z][a-z0-9_-]{0,47}$" },
              title: { type: "string", minLength: 1, maxLength: 80 },
              caption: { type: "string", maxLength: 240 },
              alt: { type: "string", maxLength: 160 },
              ...imageInputSchema("result"),
              ...imageInputSchema("source"),
            },
          },
        },
      },
    },
    outputSchema: {
      type: "object", required: ["gallery"],
      additionalProperties: false,
      properties: {
        gallery: {
          type: "object",
          additionalProperties: false,
          required: ["schemaVersion", "title", "mode", "items"],
          properties: {
            schemaVersion: { type: "integer", const: 1 },
            title: { type: "string" },
            mode: { type: "string", enum: ["text_to_image", "image_to_image"] },
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "title", "caption", "alt", "resultDataUri"],
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  caption: { type: "string" },
                  alt: { type: "string" },
                  sourceDataUri: { type: "string", pattern: "^data:image/(png|jpeg|webp);base64," },
                  resultDataUri: { type: "string", pattern: "^data:image/(png|jpeg|webp);base64," },
                  sourceContentIndex: { type: "integer", minimum: 1 },
                  resultContentIndex: { type: "integer", minimum: 1 },
                },
              },
            },
          },
        },
      },
    },
    _meta: toolUiMeta(RESULTS_URI),
  };
}

function decodeDataUri(value, label) {
  const match = String(value || "").match(IMAGE_DATA_URI);
  if (!match) throw new Error(`${label} must be a PNG, JPEG, or WebP data URI`);
  const data = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!data.length || data.length > MAX_IMAGE_BYTES) throw new Error(`${label} must contain 1-${MAX_IMAGE_BYTES} bytes`);
  const mimeType = detectImageMime(data, label);
  if (mimeType !== `image/${match[1]}`) throw new Error(`${label} MIME type does not match its image bytes`);
  return { data, mimeType };
}

function detectImageMime(data, label) {
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255) return "image/jpeg";
  if (data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  throw new Error(`${label} is not a readable PNG, JPEG, or WebP image`);
}

function loadImage(raw, prefix, itemLabel) {
  const path = optionalText(raw[`${prefix}_path`], `${itemLabel} ${prefix}_path`, 4096);
  const dataUri = optionalText(raw[`${prefix}_data_uri`], `${itemLabel} ${prefix}_data_uri`, MAX_IMAGE_BYTES * 2);
  if (Boolean(path) === Boolean(dataUri)) throw new Error(`${itemLabel} must provide exactly one of ${prefix}_path or ${prefix}_data_uri`);
  if (dataUri) return decodeDataUri(dataUri, `${itemLabel} ${prefix}_data_uri`);
  if (!isAbsolute(path)) throw new Error(`${itemLabel} ${prefix}_path must be absolute`);
  const generatedRootPath = resolve(process.cwd(), "generated-images");
  if (prefix === "result") {
    const fromGeneratedRootPath = relative(generatedRootPath, path);
    if (fromGeneratedRootPath === "" || fromGeneratedRootPath.startsWith(`..${sep}`) || isAbsolute(fromGeneratedRootPath)) {
      throw new Error(`${itemLabel} result_path must be inside the current workspace generated-images directory`);
    }
  }
  const realPath = realpathSync(path);
  if (prefix === "result") {
    const generatedRoot = realpathSync(generatedRootPath);
    const fromGeneratedRoot = relative(generatedRoot, realPath);
    if (fromGeneratedRoot === "" || fromGeneratedRoot.startsWith(`..${sep}`) || isAbsolute(fromGeneratedRoot)) {
      throw new Error(`${itemLabel} result_path must be inside the current workspace generated-images directory`);
    }
  }
  const stats = statSync(realPath);
  if (!stats.isFile() || stats.size < 1 || stats.size > MAX_IMAGE_BYTES) {
    throw new Error(`${itemLabel} ${prefix}_path must be a 1-${MAX_IMAGE_BYTES} byte file`);
  }
  const data = readFileSync(realPath);
  return { data, mimeType: detectImageMime(data, `${itemLabel} ${prefix}_path`) };
}

function normalizeGallery(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("arguments must be an object");
  const mode = text(args.mode, "mode", 30);
  if (!new Set(["text_to_image", "image_to_image"]).has(mode)) throw new Error("mode is unsupported");
  if (!Array.isArray(args.items) || args.items.length < 1 || args.items.length > 8) throw new Error("items must contain 1-8 images");
  const content = [{ type: "text", text: "Result UI ready. Do not repeat the gallery, images, or brief; end this turn." }];
  let galleryBytes = 0;
  const items = args.items.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`item ${index + 1} must be an object`);
    const itemLabel = `item ${index + 1}`;
    const id = stableId(raw.id, `${itemLabel} id`);
    const title = text(raw.title, `${itemLabel} title`, 80);
    const caption = optionalText(raw.caption, `${itemLabel} caption`, 240);
    const alt = optionalText(raw.alt, `${itemLabel} alt`, 160) || `${title}珠宝设计图`;
    let sourceContentIndex;
    let sourceDataUri;
    if (mode === "image_to_image") {
      const source = loadImage(raw, "source", itemLabel);
      galleryBytes += source.data.length;
      sourceDataUri = `data:${source.mimeType};base64,${source.data.toString("base64")}`;
      sourceContentIndex = content.push({ type: "image", data: source.data.toString("base64"), mimeType: source.mimeType }) - 1;
    } else if (raw.source_path || raw.source_data_uri) {
      throw new Error(`${itemLabel} source image is only valid in image_to_image mode`);
    }
    const result = loadImage(raw, "result", itemLabel);
    galleryBytes += result.data.length;
    if (galleryBytes > MAX_GALLERY_BYTES) {
      throw new Error(`gallery images must total no more than ${MAX_GALLERY_BYTES} bytes for WorkBuddy inline display; keep larger images in the main conversation`);
    }
    const resultDataUri = `data:${result.mimeType};base64,${result.data.toString("base64")}`;
    const resultContentIndex = content.push({ type: "image", data: result.data.toString("base64"), mimeType: result.mimeType }) - 1;
    return {
      id,
      title,
      caption,
      alt,
      ...(sourceDataUri === undefined ? {} : { sourceDataUri }),
      ...(sourceContentIndex === undefined ? {} : { sourceContentIndex }),
      resultDataUri,
      resultContentIndex,
    };
  });
  if (new Set(items.map(({ id }) => id)).size !== items.length) throw new Error("item ids must be unique");
  return {
    content,
    structuredContent: {
      gallery: {
        schemaVersion: 1,
        title: text(args.title, "title", 80),
        mode,
        items,
      },
    },
    _meta: toolUiMeta(RESULTS_URI),
  };
}

function callInterviewTool(params) {
  const interview = normalizeInterview(params.arguments || {});
  return {
    content: [{ type: "text", text: "UI ready. Do not repeat its questions or roadmap; end this turn and wait for submission." }],
    structuredContent: { interview },
    _meta: toolUiMeta(),
  };
}

function callTool(params) {
  if (params?.name === "ask_grill_me_questions") return callInterviewTool(params);
  if (params?.name === "show_jewel_results") return normalizeGallery(params.arguments || {});
  throw new Error(`unknown tool: ${params?.name || ""}`);
}

function resultFor(method, params) {
  if (method === "initialize") {
    return {
      protocolVersion: MCP_VERSION,
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    };
  }
  if (method === "tools/list") return { tools: [interviewToolDescriptor(), resultToolDescriptor()] };
  if (method === "resources/templates/list") return { resourceTemplates: [] };
  if (method === "resources/list") {
    return { resources: [
      { name: "jewel-buddy-interview-v4", uri: RESOURCE_URI, mimeType: "text/html;profile=mcp-app" },
      { name: "jewel-buddy-results-v2", uri: RESULTS_URI, mimeType: "text/html;profile=mcp-app" },
    ] };
  }
  if (method === "resources/read") {
    if (!new Set([RESOURCE_URI, RESULTS_URI]).has(params?.uri)) throw new Error(`unknown resource: ${params?.uri || ""}`);
    return {
      contents: [{
        uri: params.uri,
        mimeType: "text/html;profile=mcp-app",
        text: readFileSync(HTML_PATH, "utf8"),
        _meta: {
          ui: {
            csp: {},
            permissions: {},
            prefersBorder: false,
          },
        },
      }],
    };
  }
  if (method === "tools/call") return callTool(params);
  throw new Error(`unknown method: ${method}`);
}

function handle(message) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return null;
  if (message.id === undefined) return null;
  try {
    return { jsonrpc: "2.0", id: message.id, result: resultFor(message.method, message.params || {}) };
  } catch (caught) {
    return { jsonrpc: "2.0", id: message.id, error: error(-32602, caught.message) };
  }
}

function startStdio() {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  lines.on("line", (line) => {
    if (!line.trim()) return;
    try {
      const response = handle(JSON.parse(line));
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (caught) {
      process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: error(-32700, caught.message) })}\n`);
    }
  });
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("request body is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function writeJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function startHttp(port) {
  const httpServer = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id");

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/health") {
      writeJson(response, 200, { ok: true, name: SERVER_NAME, version: SERVER_VERSION });
      return;
    }
    if (url.pathname !== "/mcp") {
      writeJson(response, 404, { error: "not found" });
      return;
    }
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST, OPTIONS");
      writeJson(response, 405, { error: "method not allowed" });
      return;
    }

    try {
      const raw = await readRequestBody(request);
      const message = JSON.parse(raw);
      const result = handle(message);
      if (!result) {
        response.writeHead(202);
        response.end();
        return;
      }
      writeJson(response, 200, result);
    } catch (caught) {
      writeJson(response, 400, {
        jsonrpc: "2.0",
        id: null,
        error: error(-32700, caught.message),
      });
    }
  });

  httpServer.on("error", (caught) => {
    console.error(`[${SERVER_NAME}] HTTP server failed: ${caught.message}`);
    process.exitCode = 1;
  });
  httpServer.listen(port, "127.0.0.1", () => {
    const address = httpServer.address();
    const activePort = typeof address === "object" && address ? address.port : port;
    console.error(`[${SERVER_NAME}] MCP server running on http://127.0.0.1:${activePort}/mcp`);
  });
}

async function checkHttp(url, expectedVersion) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const health = await response.json();
    if (health?.ok !== true || health?.name !== SERVER_NAME) {
      throw new Error(`unexpected service identity: ${JSON.stringify(health)}`);
    }
    if (expectedVersion && health.version !== expectedVersion) {
      throw new Error(`expected ${expectedVersion}, received ${health.version || "unknown"}`);
    }
    process.stdout.write(`${JSON.stringify(health)}\n`);
  } finally {
    clearTimeout(timeout);
  }
}

async function inspectHttp(endpoint, expectedVersion) {
  const healthUrl = new URL("/health", endpoint).href;
  await checkHttp(healthUrl, expectedVersion);
  const post = async (id, method, params) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-protocol-version": MCP_VERSION,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) }),
    });
    if (!response.ok) throw new Error(`${method} returned HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(`${method}: ${payload.error.message || "unknown error"}`);
    return payload.result;
  };
  await post(1, "initialize", {
    protocolVersion: MCP_VERSION,
    capabilities: {},
    clientInfo: { name: "jewel-buddy-doctor", version: SERVER_VERSION },
  });
  const tools = await post(2, "tools/list");
  const resources = await post(3, "resources/list");
  const toolNames = tools?.tools?.map(({ name }) => name) || [];
  const resourceUris = resources?.resources?.map(({ uri }) => uri) || [];
  const expectedTools = ["ask_grill_me_questions", "show_jewel_results"];
  const expectedResources = [RESOURCE_URI, RESULTS_URI];
  if (JSON.stringify(toolNames) !== JSON.stringify(expectedTools)) {
    throw new Error(`expected 2/2 tools, received ${JSON.stringify(toolNames)}`);
  }
  if (JSON.stringify(resourceUris) !== JSON.stringify(expectedResources)) {
    throw new Error(`expected 2 resources, received ${JSON.stringify(resourceUris)}`);
  }
  process.stdout.write(`${JSON.stringify({ tools: toolNames.length, resources: resourceUris.length })}\n`);
}

const argv = process.argv.slice(2);
if (argv.includes("--inspect")) {
  const inspectIndex = argv.indexOf("--inspect");
  const versionIndex = argv.indexOf("--expect-version");
  const endpoint = argv[inspectIndex + 1];
  const expectedVersion = versionIndex >= 0 ? argv[versionIndex + 1] : undefined;
  if (!endpoint) throw new Error("--inspect requires an MCP endpoint URL");
  await inspectHttp(endpoint, expectedVersion);
} else if (argv.includes("--check")) {
  const checkIndex = argv.indexOf("--check");
  const versionIndex = argv.indexOf("--expect-version");
  const checkUrl = argv[checkIndex + 1];
  const expectedVersion = versionIndex >= 0 ? argv[versionIndex + 1] : undefined;
  if (!checkUrl) throw new Error("--check requires a health URL");
  await checkHttp(checkUrl, expectedVersion);
} else if (argv.includes("--http")) {
  const portIndex = argv.indexOf("--port");
  const rawPort = portIndex >= 0 ? argv[portIndex + 1] : process.env.JEWEL_BUDDY_HTTP_PORT || "39528";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("--port must be an integer from 0 to 65535");
  startHttp(port);
} else {
  startStdio();
}
