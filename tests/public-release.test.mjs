import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");

test("README and install guide document the WorkBuddy plugin flow", () => {
  const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
  const install = readFileSync(resolve(ROOT, "INSTALL.md"), "utf8");
  for (const content of [readme, install]) {
    assert.match(content, /codebuddy --plugin-dir \.\/plugins\/jewel-buddy --serve/);
    assert.match(content, /workbuddy\.cn\/docs\/cli\/mcp-apps/);
  }
  assert.match(readme, /app\.sendMessage/);
  assert.match(readme, /一次性安装并验证 Jewel Buddy for WorkBuddy/);
  assert.match(readme, /不要创建定时任务/);
  assert.match(readme, /Teresa1228\/GrillMeJewel/);
  assert.match(readme, /codex\/workbuddy-port/);
  assert.match(readme, /npm run install:workbuddy/);
  assert.match(readme, /npm run doctor:workbuddy/);
  assert.match(readme, /MCP\/连接器页面信任并开启 `jewel-buddy`/);
  assert.match(readme, /旧消息里的卡片也不会原地更新/);
  assert.match(readme, /连接器 → 自定义连接/);
  assert.match(readme, /2\/2 个工具已启用、2 个资源/);
  assert.match(readme, /不要回退到原生对话卡片/);
  assert.match(readme, /`ui:\/\/jewel-buddy\/interview\/v5\.html` 是资源标识/);
  assert.match(readme, /show_jewel_results/);
  assert.match(readme, /图生图/);
  assert.match(readme, /新的、视觉一致的结果卡/);
  assert.match(readme, /await app\.updateModelContext/);
  assert.match(readme, /不把内部 JSON 塞进可见对话/);
  assert.match(install, /git clone --branch codex\/workbuddy-port --single-branch/);
  assert.match(install, /npm run install:workbuddy/);
  assert.match(install, /npm run doctor:workbuddy/);
  assert.match(install, /jewel-buddy: \.\.\. ✓ Connected/);
  assert.match(install, /2\/2 tools, 2 resources/);
  assert.match(install, /无需保持终端/);
  assert.match(install, /同名连接器指向其他未知程序/);
  assert.match(install, /新建\s*对话/);
  assert.match(install, /信任/);
  assert.match(install, /不要回退到原生对话卡片/);
});

test("README exposes a Codex-style one-shot WorkBuddy update path", () => {
  const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
  const update = readFileSync(resolve(ROOT, "UPDATE.md"), "utf8");

  assert.match(readme, /## 一句话安装/);
  assert.match(readme, /## 一句话更新/);
  assert.match(readme, /Read https:\/\/raw\.githubusercontent\.com\/Teresa1228\/GrillMeJewel\/codex\/workbuddy-port\/UPDATE\.md/);
  assert.match(readme, /请阅读 https:\/\/raw\.githubusercontent\.com\/Teresa1228\/GrillMeJewel\/codex\/workbuddy-port\/UPDATE\.md/);
  assert.match(readme, /已有安装使用 \[UPDATE\.md\]\(UPDATE\.md\)/);
  assert.match(update, /git status --short/);
  assert.match(update, /switch --detach origin\/codex\/workbuddy-port/);
  assert.match(update, /merge --ff-only origin\/codex\/workbuddy-port/);
  assert.match(update, /npm run install:workbuddy/);
  assert.match(update, /npm run doctor:workbuddy/);
  assert.match(update, /2\/2 tools, 2 resources/);
  assert.match(update, /完全退出并重新打开 WorkBuddy/);
  assert.match(update, /不删除对话、brief、生成图片/);
  assert.match(update, /不要创建定时任务/);
  assert.match(update, /已恢复更新前版本/);
});

test("troubleshooting records the high-frequency WorkBuddy failure modes", () => {
  const guide = readFileSync(resolve(ROOT, "docs/TROUBLESHOOTING.md"), "utf8");
  assert.match(guide, /four identities/);
  assert.match(guide, /must all be `jewel-buddy`/);
  assert.match(guide, /Never add\s+`http:\/\/`/);
  assert.match(guide, /Plugin stdio and a manual global connector/);
  assert.match(guide, /old card never hot-reloads/);
  assert.match(guide, /EADDRINUSE/);
  assert.match(guide, /no separate Widget frontend server/);
  assert.match(guide, /increment that resource URI/);
  assert.match(guide, /images\[\]\.localPath/);
  assert.match(guide, /results\/v5\.html/);
  assert.match(guide, /Apps UI appears inside collapsed deep thinking/);
});
