# Jewel Buddy for WorkBuddy

<p align="center">
  <img src="plugins/jewel-buddy/assets/brand/logo-header.webp" alt="苏哇科技 GrillMeJewel" width="176">
</p>

Jewel Buddy `0.3.4` 是 [GrillMeJewel](https://github.com/yuyou-dev/GrillMeJewel) 的 WorkBuddy / CodeBuddy 发行版。当前 WorkBuddy 预览版发布在 [`Teresa1228/GrillMeJewel` 的 `codex/workbuddy-port` 分支](https://github.com/Teresa1228/GrillMeJewel/tree/codex/workbuddy-port)。它用内嵌 MCP Apps 表单完成四轮珠宝需求访谈、单独确认 brief，再由主对话调用当前已授权的真实图片工具。

![Jewel Buddy 内嵌访谈界面](docs/images/apps-ui-interview.png)

## 一句话安装

在 WorkBuddy 中新建对话，粘贴以下任一目标。每个目标只发送一次；不要创建定时任务、自动化或循环执行：

```text
/goal Read https://raw.githubusercontent.com/Teresa1228/GrillMeJewel/codex/workbuddy-port/INSTALL.md to install and verify Jewel Buddy for WorkBuddy once, then tell me how to trust, enable, and fully restart it.
```

```text
/goal 请阅读 https://raw.githubusercontent.com/Teresa1228/GrillMeJewel/codex/workbuddy-port/INSTALL.md，一次性安装并验证 Jewel Buddy for WorkBuddy，然后告诉我如何信任、开启并完整重启它。
```

WorkBuddy 会完成环境检查、安装和健康检查，再提示你完成宿主必须由用户执行的信任与重启。完整步骤见 [INSTALL.md](INSTALL.md)。

## 一句话更新

已经安装过 Jewel Buddy？在 WorkBuddy 中新建对话，粘贴以下任一目标：

```text
/goal Read https://raw.githubusercontent.com/Teresa1228/GrillMeJewel/codex/workbuddy-port/UPDATE.md to safely update and verify my existing Jewel Buddy for WorkBuddy installation once, preserve my work and unrelated connectors, and tell me when to fully restart WorkBuddy.
```

```text
/goal 请阅读 https://raw.githubusercontent.com/Teresa1228/GrillMeJewel/codex/workbuddy-port/UPDATE.md，一次性安全更新并验证我现有的 Jewel Buddy for WorkBuddy，保留我的创作内容和其他连接器，并告诉我何时需要完全重启 WorkBuddy。
```

更新流程只快进可信分支并重跑同一个幂等安装器，不删除对话、brief、生成图片或其他连接器。首次安装使用 [INSTALL.md](INSTALL.md)，已有安装使用 [UPDATE.md](UPDATE.md)。

## 关键链路

```text
主对话调用 ask_grill_me_questions
  → WorkBuddy 根据 _meta.ui.resourceUri 与 launchSurface:inline 内联渲染 widget
  → 用户在 widget 中完成本轮回答
  → app.updateModelContext 隐式回写完整结构化答案
  → app.sendMessage(send) 只显示一句简短续接消息，并立即唤起 agent
  → agent 继续访谈；最终确认后调用真实图片生成工具
  → 等待生成完成并取得全部真实图片路径或 data URI
  → 先完成 WorkBuddy 主对话的原生图片/文件展示
  → 原生展示成功后，最后调用 show_jewel_results 回显 Apps UI 画廊
```

核心代码在：

- `plugins/jewel-buddy/mcp/server.mjs`：stdio/诊断 HTTP MCP server、tool 与 UI resource。
- `plugins/jewel-buddy/mcp/interview.html`：WorkBuddy MCP Apps widget。
- `plugins/jewel-buddy/skills/jewel-buddy/SKILL.md`：主对话的访谈与出图工作流。
- `plugins/jewel-buddy/.codebuddy-plugin/plugin.json`：WorkBuddy 插件清单。
- `plugins/jewel-buddy/.mcp.json`：插件内 MCP 注册。

## 安装与首次使用

一次性目标会检出当前 WorkBuddy 分支，安装仓库中唯一的 Jewel Buddy 用户级 Skill，并通过 WorkBuddy 自带 CLI 注册一个用户级本地 HTTP 连接器。安装器同时创建操作系统用户级托管服务：macOS 使用 LaunchAgent，Windows 使用登录启动项，Linux 使用 systemd user service。服务只监听 `127.0.0.1`，无需保持终端窗口；macOS/Linux 会在异常退出后自动恢复，Windows 会在用户登录后自动启动。安装完成后，你只需要在 WorkBuddy 的 MCP/连接器页面信任并开启 `jewel-buddy`。

已经下载仓库时，可以双击根目录的 `Install Jewel Buddy.command`（macOS）或 `Install Jewel Buddy.cmd`（Windows）。也可以手动执行：

```bash
git clone --branch codex/workbuddy-port --single-branch https://github.com/Teresa1228/GrillMeJewel.git
cd GrillMeJewel
npm run install:workbuddy
```

安装器会自动查找 macOS/Windows WorkBuddy Desktop 的常见内置 CLI 路径；若应用安装在自定义位置，可先把其 `codebuddy` 绝对路径设置到 `WORKBUDDY_CLI`。

安装后前往 **WorkBuddy → 连接器 → 自定义连接**，核对 `http://127.0.0.1:39528/mcp`，信任 `jewel-buddy` MCP 并开启开关。首次安装后必须**完全退出并重新打开 WorkBuddy**；只关闭窗口不够。重开后回到安装目录运行：

```bash
npm run doctor:workbuddy
```

健康检查必须同时显示托管 MCP `✓ Healthy (2/2 tools, 2 resources)`、连接器 `✓ Connected`、Skill `✓ Installed` 与 Apps UI catalog `✓ Ready`。这也自动复查连接器面板里的“2/2 个工具已启用、2 个资源”。只有四项全部通过，才在新对话测试；旧消息里的卡片也不会原地更新。当前连接器预览路径不运行 `/reload-plugins`。如果第四项未通过，按 doctor 的提示再次完整重启并重新开关连接器，不要回退到原生对话卡片。

开始设计：

```text
用 Jewel Buddy 帮我设计一件送给母亲的吊坠；请用可视化表单逐步确认需求，确认后生成并展示设计图。
```

WorkBuddy 通过连接器开关使用本机 `jewel-buddy` HTTP server，操作系统负责启动与异常恢复。Widget 遵循 [WorkBuddy MCP Apps 接入指南](https://www.workbuddy.cn/docs/cli/mcp-apps)。托管服务以当前用户权限执行代码，只应从你信任的仓库安装。

## 运行模式

| 模式 | 用途 | 是否需要单独服务 |
| --- | --- | --- |
| 一键连接器安装 | 当前 GitHub 预览默认路径；系统托管本地 HTTP MCP，WorkBuddy 开关只控制连接器 | 是，由安装器自动管理 |
| Marketplace 安装 | PR 合并后的正式分发路径；插件通过 `.mcp.json` 启动 stdio MCP | 否 |
| `--plugin-dir` | 开发者直接测试当前 checkout | 否 |
| 手动 HTTP 开发 | 开发者临时观察协议与日志 | 是，终端必须保持运行；不要与托管服务同时启动 |

所有模式的插件名、MCP key、`serverInfo.name` 和 `ui://` authority 都必须是 `jewel-buddy`。`ui://jewel-buddy/interview/v5.html` 是资源标识，**不能**改成 `http://`。一键连接器的后端地址是 `http://127.0.0.1:39528/mcp`；它由操作系统托管，不是需要手工保持的开发服务器。

连接器预览与 Marketplace 插件模式二选一；不要同时启动两个同名 server。完整诊断步骤见 [Troubleshooting](docs/TROUBLESHOOTING.md)。

## 开发者本地运行

要求 Node.js 20+ 和可用的 `codebuddy` CLI。在仓库根目录执行：

```bash
npm test
npm run scan:public
npm run doctor
# or run all three gates:
npm run release:check
codebuddy plugin validate ./plugins/jewel-buddy
codebuddy --plugin-dir ./plugins/jewel-buddy --serve
```

发布前逐项完成 [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)。

如需对照 WorkBuddy Desktop 的远程 MCP Apps 目录链路，可另开终端运行零依赖的本地
Streamable HTTP 模式：

```bash
npm run serve:http
```

它只监听 `http://127.0.0.1:39528/mcp`；这是 MCP 后端端点。Widget 本身仍由
`resources/read` 返回，资源标识必须保持 `ui://jewel-buddy/interview/v5.html`，不需要
再启动一套 Widget 前端服务器。

macOS 的 WorkBuddy Desktop 若没有把 `codebuddy` 加到 `PATH`，可直接使用应用内置 CLI：

```bash
/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/cli/bin/codebuddy plugin validate ./plugins/jewel-buddy
/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/cli/bin/codebuddy --plugin-dir ./plugins/jewel-buddy --serve --open
```

`--plugin-dir` 会明确加载当前仓库，避免误测 `~/.workbuddy/mcp.json` 中同名但指向其他目录或端口的旧连接器。

进入 Web UI 后输入：

```text
请使用 Jewel Buddy 的可视化表单帮我梳理一个珠宝设计。确认 brief 后，用当前可用的图片生成工具生成设计图并展示在主对话中。
```

也可以显式调用插件 Skill：

```text
/jewel-buddy:jewel-buddy
```

MCP Apps 只在 WorkBuddy/CodeBuddy Web UI 或 IDE 内嵌 Web UI 中展示；终端 TUI 与 print 模式无法完成这套可视化访谈，应停止并提示切换到支持 Apps UI 的界面，不得继续用原生对话卡片或普通文本问题代替。详见 [WorkBuddy MCP Apps 接入指南](https://www.workbuddy.cn/docs/cli/mcp-apps)。

## widget 如何“喂”给主对话

提交时 widget 先更新模型上下文，再用一条简短消息继续对话：

```js
await app.updateModelContext({
  content: [{ type: "text", text: structuredSubmission }],
  structuredContent: { jewelBuddySubmission: payload },
});

await app.sendMessage({
  role: "user",
  content: [{ type: "text", text: "已提交 Jewel Buddy 第 1 轮；请直接展示下一轮表单。" }],
  _meta: { "codebuddy.ai/sendMessageMode": "send" },
});
```

`ui/update-model-context` 把稳定 id、显示标签和答案交给下一次模型调用，但不把内部 JSON 塞进可见对话。`send` 只写入一句简短用户气泡并立即触发 agent。确认轮同样只显示一句生成指令；MCP server 本身不持有密钥、不调用图片供应商，也不会伪造生成成功。

## 图片结果闭环

真实图片工具成功并返回全部图片后，主对话必须先完成 WorkBuddy 原生图片/文件展示，确认成功后才能调用同一 MCP 的 `show_jewel_results`。不得把图片生成、原生展示和结果 UI 放进同一个并行工具批次。结果工具只读取图片工具明确返回且位于当前工作区 `generated-images/` 的本地结果路径，或接收其返回的 `data:` 图片；不会请求图片供应商、上传文件或保存副本。结果同时作为标准 MCP image content 和受大小限制的 `structuredContent` 图片数据回传：前者供主对话原生展示，后者兼容 WorkBuddy 只把 `structuredContent` 交给 Apps iframe 的行为。两条结果都不包含本地路径。结果卡 v5 在 tool-input 阶段只显示等待态，只有含真实图片数据的 tool-result 才渲染画廊，避免先报“无图片数据”再补图。

- 文生图：显示结果画廊；多张图用“上一张 / 下一张”浏览。
- 图生图：每个结果同时显示原图和生成图，可拖动中间分隔线比较变化。
- 为控制 WorkBuddy 消息体，结果卡中所有原图与生成图的原始字节总和不得超过 1.5 MiB；更大的文件继续使用主对话原生图片展示。
- 原访谈卡不会被后续的另一个工具结果原地改写；WorkBuddy 会在同一对话中渲染一张新的、视觉一致的结果卡。这符合 MCP Apps 的 tool-result 渲染模型。

若图片工具只返回宿主内部附件、没有本地路径或 `data:` 内容，主对话仍应原生展示图片，并如实说明本次无法生成结果画廊，不能伪造路径。

## 安全与兼容性

- widget 内置一个轻量的 MCP Apps JSON-RPC bridge，不依赖运行时 CDN 或包安装。
- CSP 默认拒绝所有外部连接，只允许内联脚本、样式以及 `data:` / `blob:` 图片。
- 图片生成发生在主对话，不发生在 iframe 或本地 MCP server。
- 访谈状态以主对话为事实源，不写数据库、不上传附件。
- README 延续 Codex 发行版原有的苏哇科技动态标识；运行时访谈 UI 不额外添加旧版没有的品牌装饰。品牌使用边界见 `TRADEMARKS.md`。

首次安装与验收步骤见 [INSTALL.md](INSTALL.md)，安全更新步骤见 [UPDATE.md](UPDATE.md)。
