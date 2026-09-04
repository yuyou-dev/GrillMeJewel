# Update Jewel Buddy in WorkBuddy

这是现有 Jewel Buddy for WorkBuddy 安装的一次性安全更新说明。更新只快进可信的
`codex/workbuddy-port` 分支，再重跑同一个幂等安装器；不删除对话、brief、生成图片，
不覆盖本地修改，不改变其他 Skill 或连接器。不要创建定时任务、外部服务或第二个同名连接器。

## 更新契约

- 预览仓库：`Teresa1228/GrillMeJewel`
- 固定分支：`codex/workbuddy-port`
- 默认安装目录：`~/.workbuddy/extensions/jewel-buddy`
- MCP 名称：`jewel-buddy`
- 连接地址：`http://127.0.0.1:39528/mcp`
- 先用 detached candidate 验证新版，四项检查通过后才 fast-forward 正式分支
- 只允许 fast-forward 更新；禁止 force pull、reset、清理或删除文件
- 工作区不干净、来源不一致或分支不正确时必须停止，不得 stash、覆盖或猜测
- 保留更新前 commit；失败时报告该 commit 和原始错误，不把失败伪装成成功
- 更新后仍需由用户确认本地 MCP 信任；自动化不能绕过 WorkBuddy 的安全确认

首次安装或找不到可信 checkout 时不要执行本页，改用 [INSTALL.md](INSTALL.md)。

## 给 WorkBuddy 执行的一次性步骤

1. 定位现有安装。默认目录是：

   ```bash
   ~/.workbuddy/extensions/jewel-buddy
   ```

   如果该目录不存在，只能使用用户明确提供的现有安装目录。找不到仓库时停止并报告，
   不要重新安装到另一个位置，也不要创建第二个 `jewel-buddy`。

2. 核对仓库身份、当前分支和本地修改：

   ```bash
   git -C ~/.workbuddy/extensions/jewel-buddy remote get-url origin
   git -C ~/.workbuddy/extensions/jewel-buddy branch --show-current
   git -C ~/.workbuddy/extensions/jewel-buddy status --short
   git -C ~/.workbuddy/extensions/jewel-buddy rev-parse HEAD
   ```

   `origin` 必须明确指向 `Teresa1228/GrillMeJewel`，分支必须是
   `codex/workbuddy-port`，`git status --short` 必须为空。保存 `rev-parse HEAD` 输出作为
   更新前版本。任一条件不满足都要停止，保留现场并返回完整结果；不要 stash、reset、
   checkout、删除或覆盖用户文件。

3. 获取候选版本并确认它可以从当前版本 fast-forward：

   ```bash
   git -C ~/.workbuddy/extensions/jewel-buddy fetch origin codex/workbuddy-port
   git -C ~/.workbuddy/extensions/jewel-buddy merge-base --is-ancestor HEAD origin/codex/workbuddy-port
   ```

   任一命令失败都要停止。第二条命令失败表示远端不能从当前版本安全快进；不要 merge、
   rebase 或 reset。

4. 不移动正式分支，先切换到远端候选 commit 并运行发布检查：

   ```bash
   git -C ~/.workbuddy/extensions/jewel-buddy switch --detach origin/codex/workbuddy-port
   cd ~/.workbuddy/extensions/jewel-buddy
   npm test
   npm run scan:public
   npm run doctor
   ```

   任一检查失败时，执行第 7 步回滚。不要把未通过检查的 commit 写入正式分支。

5. 在候选版本上重跑幂等安装器：

   ```bash
   cd ~/.workbuddy/extensions/jewel-buddy
   npm run install:workbuddy
   ```

   安装器会更新它管理的 Jewel Buddy Skill、托管服务和唯一同名连接器。它不会安装运行时
   依赖，也不能覆盖来源未知的同名 Skill 或连接器。若检测到冲突，返回原始错误并停止。

6. 安装器成功后告诉用户**完全退出并重新打开 WorkBuddy**；只关闭窗口不够。更新可能改变
   Apps UI 资源 URI，旧对话中的卡片不会热更新。重开后前往 **WorkBuddy → 连接器 → 自定义连接**，
   确认 `jewel-buddy` 地址仍为 `http://127.0.0.1:39528/mcp`、开关已开启，并在 WorkBuddy
   再次提示时重新确认信任。当前连接器预览路径不运行 `/reload-plugins`。

   回到同一个安装目录运行：

   ```bash
   npm run doctor:workbuddy
   ```

   更新完成必须同时出现：

   ```text
   Jewel Buddy managed MCP: ... ✓ Healthy (2/2 tools, 2 resources)
   jewel-buddy: ... ✓ Connected
   jewel-buddy Skill: ... ✓ Installed
   Jewel Buddy Apps UI catalog - ✓ Ready
   ```

   四项全部通过后才把正式分支快进到已验证的候选版本：

   ```bash
   git -C ~/.workbuddy/extensions/jewel-buddy switch codex/workbuddy-port
   git -C ~/.workbuddy/extensions/jewel-buddy merge --ff-only origin/codex/workbuddy-port
   ```

   完成时报告更新前和更新后的 commit。不要创建定时任务；当前连接器预览路径不运行
   `/reload-plugins`。

7. 如果候选版本的发布检查、安装或四项 doctor 验收失败，先保留原始错误，再切回仍指向
   更新前 commit 的正式分支并重装旧版：

   ```bash
   git -C ~/.workbuddy/extensions/jewel-buddy switch codex/workbuddy-port
   cd ~/.workbuddy/extensions/jewel-buddy
   npm run install:workbuddy
   ```

   完全退出并重新打开 WorkBuddy，再运行 `npm run doctor:workbuddy`。旧版四项检查全部恢复后，
   报告“新版更新失败、已恢复更新前版本”、两个 commit 和原始错误。如果切回或旧版安装也失败，
   立即停止并保留现场；不要 reset、删除用户内容或修改其他连接器。

8. 新版四项检查和正式分支快进全部成功后，在新对话测试可视化表单。不要在旧卡片中重试，也不要在 Apps UI
   缺失时回退到原生对话卡片或普通文本问答。

开始验证的提示词：

```text
用 Jewel Buddy 帮我设计一枚蓝宝石戒指；请用可视化表单逐步确认需求，确认后先生成并展示图片，再展示结果 UI。
```
