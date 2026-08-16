# GrillMeJewel

从一句模糊的珠宝想法开始，通过简洁的多轮 Apps UI 访谈确认设计需求，再由 Codex
gpt-image-2 生成真实珠宝设计图。

## 一句话安装

把下面整句发送给本地 Codex Desktop：

```text
/goal Read https://raw.githubusercontent.com/yuyou-dev/GrillMeJewel/main/INSTALL.md to install and verify GrillMeJewel, then create and open a new Grill Me Jewel task for me.
```

中文版本：

```text
/goal 阅读 https://raw.githubusercontent.com/yuyou-dev/GrillMeJewel/main/INSTALL.md，安装并验证 GrillMeJewel，然后为我创建并打开一个新的 Grill Me 珠宝任务。
```

安装结束后请完全重启 Codex，并在新任务中测试。旧任务不会热加载新插件。

## 它做什么

- 识别“我想做点珠宝”这类尚未成形的需求。
- 每轮用 Apps UI 展示一至四个问题，但界面一次只显示一题，避免嵌套滚动。
- 保存品类、母题、风格、材质、参考图角色和最终呈现等已确认事实。
- 给出一份可读、可复用的珠宝设计 brief，并让设计师最终确认。
- 使用 Codex gpt-image-2 生成真实设计图；多款需求逐张生成，不用拼图冒充交付。

它不提供 CAD、生产参数、宝石鉴定或品牌事实，也不会在没有实际图片结果时声称完成设计。

## 快速体验

安装并重启后，在新任务中从 Skill 选择器选择 `Grill Me 珠宝`，或输入：

```text
请进入 Grill Me 珠宝模式。我只有一个模糊想法，请先用可视化表单访谈我，确认方案后再生成设计图。
```

也可以直接说：

```text
我想设计一件送给母亲的珠宝，但还不知道做什么。
```

## 工作方式

```mermaid
flowchart LR
  A["模糊想法"] --> B["Apps UI 多轮访谈"]
  B --> C["确认设计 brief"]
  C --> D["gpt-image-2 生成"]
  D --> E["真实珠宝设计图"]
```

GrillMeJewel 是独立插件，只需要本地 Codex Desktop、Git、Node.js 20+、可用的 Codex
登录和 gpt-image-2 权限。不需要安装其他珠宝插件，也不需要复制 API Key。

## 支持范围

| 环境 | v0.1.0 |
| --- | --- |
| macOS Codex Desktop | 支持 |
| Windows Codex Desktop | 支持 |
| Codex 网页远程环境 | 不支持本地插件安装 |
| Linux Desktop | 暂未作为正式验收环境 |

## 维护

- [完整安装、升级与卸载](INSTALL.md)
- [架构与安全边界](docs/ARCHITECTURE.md)
- [故障排查](docs/TROUBLESHOOTING.md)
- [安全政策](SECURITY.md)
- [贡献指南](CONTRIBUTING.md)

代码使用 Apache-2.0。项目名称和“苏哇科技”品牌标识适用单独的
[商标说明](TRADEMARKS.md)。
