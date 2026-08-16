#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const SERVER_NAME = "grill_me_jewel_ui";
const SERVER_VERSION = "0.1.0";
const MCP_VERSION = "2025-11-25";
const RESOURCE_URI = "ui://grill-me-jewel/interview/v1.html";
const HTML_PATH = fileURLToPath(new URL("./interview.html", import.meta.url));

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

function normalizeOption(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`option ${index + 1} must be an object`);
  return {
    value: stableId(raw.value, `option ${index + 1} value`),
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
  return {
    schemaVersion: 1,
    title: text(args.title || "Grill Me 珠宝", "title", 80),
    intro: optionalText(args.intro, "intro", 240),
    round,
    submitLabel: optionalText(args.submitLabel, "submitLabel", 30) || "提交本轮回答",
    questions,
  };
}

function toolDescriptor() {
  return {
    name: "ask_grill_me_questions",
    description: "Present one Grill Me Jewel interview round. Ask 1-4 unresolved questions; the UI shows one question at a time and returns stable answer ids to the conversation.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "questions"],
      properties: {
        title: { type: "string", minLength: 1, maxLength: 80 },
        intro: { type: "string", maxLength: 240 },
        round: { type: "integer", minimum: 1, maximum: 12 },
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
    _meta: {
      ui: { resourceUri: RESOURCE_URI },
      "openai/outputTemplate": RESOURCE_URI,
    },
  };
}

function callTool(params) {
  if (params?.name !== "ask_grill_me_questions") throw new Error(`unknown tool: ${params?.name || ""}`);
  const interview = normalizeInterview(params.arguments || {});
  return {
    content: [{ type: "text", text: `请在 Grill Me 珠宝表单中完成第 ${interview.round} 轮回答。` }],
    structuredContent: { interview },
    _meta: { ui: { resourceUri: RESOURCE_URI }, "openai/outputTemplate": RESOURCE_URI },
  };
}

function resultFor(method, params) {
  if (method === "initialize") {
    return {
      protocolVersion: MCP_VERSION,
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    };
  }
  if (method === "tools/list") return { tools: [toolDescriptor()] };
  if (method === "resources/list") {
    return { resources: [{ name: "grill-me-jewel-interview-v1", uri: RESOURCE_URI, mimeType: "text/html;profile=mcp-app" }] };
  }
  if (method === "resources/read") {
    if (params?.uri !== RESOURCE_URI) throw new Error(`unknown resource: ${params?.uri || ""}`);
    return {
      contents: [{
        uri: RESOURCE_URI,
        mimeType: "text/html;profile=mcp-app",
        text: readFileSync(HTML_PATH, "utf8"),
        _meta: { ui: { prefersBorder: false } },
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
