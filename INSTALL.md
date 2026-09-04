# Install Jewel Buddy in WorkBuddy

这是一个一次性安装说明，目标是把当前 GitHub 预览分支注册成 WorkBuddy 用户级本地 HTTP
MCP，并交给操作系统自动启动和恢复。完成后，用户只需要在 WorkBuddy 的 MCP/连接器页面
开启 `jewel-buddy`；无需保持终端。不要创建外部托管服务或第二个同名连接器。

## 安装契约

- 预览仓库：`Teresa1228/GrillMeJewel`
- 固定分支：`codex/workbuddy-port`
- MCP 名称：`jewel-buddy`
- 传输方式：本机 Streamable HTTP
- 连接地址：`http://127.0.0.1:39528/mcp`
- Node.js：20 或更高版本
- macOS 使用用户 LaunchAgent，Windows 使用登录启动项，Linux 使用 systemd user service
- 服务只绑定 `127.0.0.1`，无需保持终端窗口；macOS/Linux 异常退出后自动恢复，Windows 登录后自动启动
- 不安装运行时依赖，不读取凭证，不修改其他连接器或其他 Skill
- 不允许在 Apps UI 未出现时回退为原生对话卡片或普通文本问答

GitHub 的 `/tree/codex/workbuddy-port` 是浏览器页面地址，不能直接作为 Git clone 或 MCP
地址。安装时必须检出分支本身。

## 给 WorkBuddy 执行的一次性步骤

1. 确认 Node.js 版本：

   ```bash
   node --version
   ```

   低于 20 时停止并报告，不要自动安装系统软件。

2. 使用稳定目录克隆预览分支。若目录已经存在，先确认 `origin` 指向同一仓库；来源不一致
   时停止，不覆盖或删除目录。

   ```bash
   git clone --branch codex/workbuddy-port --single-branch https://github.com/Teresa1228/GrillMeJewel.git ~/.workbuddy/extensions/jewel-buddy
   ```

   已有正确 checkout 时更新：

   ```bash
   git -C ~/.workbuddy/extensions/jewel-buddy fetch origin codex/workbuddy-port
   git -C ~/.workbuddy/extensions/jewel-buddy switch codex/workbuddy-port
   git -C ~/.workbuddy/extensions/jewel-buddy pull --ff-only origin codex/workbuddy-port
   ```

3. 在仓库根目录运行幂等安装器：

   ```bash
   cd ~/.workbuddy/extensions/jewel-buddy
   npm run install:workbuddy
   ```

   安装器会寻找 WorkBuddy 自带的 `codebuddy` CLI，显式使用桌面版的 `~/.workbuddy`
   配置目录，把仓库中唯一的 Jewel Buddy Skill 同步到
   `~/.workbuddy/skills/jewel-buddy/`，安装用户级托管服务，并调用官方 `mcp add` 命令注册：

   ```text
   http://127.0.0.1:39528/mcp
   ```

   后端仍是仓库内的零依赖 `server.mjs`，但由操作系统管理生命周期；关掉安装终端或重启
   电脑都不会让端口永久失效。如果同名连接器指向其他未知程序，或用户 Skill 目录已有
   并非本安装器管理的同名内容，安装器必须停止，不能覆盖用户配置。

4. 打开 **WorkBuddy → 连接器 → 自定义连接**，找到 `jewel-buddy`，核对地址为
   `http://127.0.0.1:39528/mcp`，信任本地 MCP 并开启开关。信任是宿主的安全确认，安装器
   不能替用户绕过。首次安装后再**完全退出并重新打开 WorkBuddy**；只关闭窗口不够，完整
   重启会让 MCP Apps UI 目录重新扫描。

5. 回到安装目录，验证真实连接和 Apps UI 目录，而不是只相信“添加成功”的提示：

   ```bash
   npm run doctor:workbuddy
   ```

   该命令会执行 WorkBuddy 的 `mcp list` 握手检查、核对已安装 Skill，并读取宿主 Apps
   诊断日志确认两个 Jewel Buddy UI 工具确实进入目录。

   成功输出必须包含：

   ```text
   Jewel Buddy managed MCP: ... ✓ Healthy (2/2 tools, 2 resources)
   jewel-buddy: ... ✓ Connected
   jewel-buddy Skill: ... ✓ Installed
   Jewel Buddy Apps UI catalog - ✓ Ready
   ```

   第一项同时复查连接器面板里的“2/2 个工具已启用、2 个资源”。任一项缺失都要返回完整
   原始错误并停止；不要让用户继续测试灰屏卡片。若检测到
   `pushToolResult.buffered` 而目录中没有 Jewel Buddy，说明工具调用虽然成功，但 UI 宿主没有
   创建 iframe；再次完整退出/重开 WorkBuddy、重新开关连接器后复查。

6. 四项全部通过后新建对话再测试。

   当前连接器预览安装不运行 `/reload-plugins`；旧对话里的卡片也不会热更新。若可视化表单
   没有出现，停止当前流程并运行 `npm run doctor:workbuddy`，不要回退到原生对话卡片或用
   普通文本问答模拟表单。

开始设计的提示词：

```text
用 Jewel Buddy 帮我设计一件送给母亲的吊坠；请用可视化表单逐步确认需求，确认后生成并展示设计图。
```

## 已下载仓库的一键入口

- macOS：双击仓库根目录的 `Install Jewel Buddy.command`
- Windows：双击仓库根目录的 `Install Jewel Buddy.cmd`
- 任意受支持平台：运行 `npm run install:workbuddy`

三个入口最终都调用同一个零依赖 Node 安装器，避免文档步骤与真实行为漂移。

## 与正式 Marketplace 的关系

当前预览分支使用托管的本地 HTTP 连接器，是因为 WorkBuddy 2.132 的 directory marketplace 会出现
“命令提示成功但没有 installed registry”的行为，而该版本对 Git URL 的 `#branch` 又没有
正确剥离 fragment；同一版本的自定义 stdio 连接器又不会进入 Apps UI 目录。托管服务只在
本机提供展示与回答回传，系统负责启动和恢复，用户无需手动运行前后端。

PR 合并到上游 `main` 后，正式发布应恢复 marketplace 安装。在迁移到正式插件前，先移除
这个预览连接器，避免插件内 MCP 与用户连接器同时注册为 `jewel-buddy`。

## 开发与发布验证

```bash
npm test
npm run scan:public
npm run doctor
codebuddy plugin validate ./plugins/jewel-buddy
```

开发者也可以使用：

```bash
codebuddy --plugin-dir ./plugins/jewel-buddy --serve --open
```

MCP Apps UI 只会在 WorkBuddy Web UI 或 IDE 内嵌 Web UI 中渲染。终端模式不能完成这套
访谈，应停止并提示用户切换界面，不得用原生对话卡片或普通文本问题代替。协议与灰屏排查见 [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)；宿主能力以
[WorkBuddy MCP Apps 文档](https://www.workbuddy.cn/docs/cli/mcp-apps)为准。
