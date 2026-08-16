# Install GrillMeJewel

This is an executable Runbook for Codex. Read it completely before changing the machine.

## Objective

Install the official `grill-me-jewel@grill-me-jewel` plugin from
`yuyou-dev/GrillMeJewel` at release `v0.1.1`, verify its Skill and local Apps UI MCP, then ask the
user to restart Codex and start a new Grill Me Jewel task.

## Safety Rules

- Continue only in a local Codex Desktop environment. Stop in web, remote, or cloud-only sessions.
- Do not request, print, copy, or inspect API keys, `auth.json`, private configuration, or unrelated files.
- Ask before installing system software or opening an installer. Never use silent administrator or sudo operations.
- Do not edit personal marketplace JSON or Codex configuration by hand.
- Treat an existing marketplace named `grill-me-jewel` that points elsewhere as a conflict; stop instead of overwriting it.
- Do not claim the current task loaded the plugin. Installation is complete only after verification;
  usage requires a full Codex restart and a new task.

## 1. Host Gate

Confirm the host is macOS or native Windows and that Codex Desktop is installed. On unsupported
hosts, stop and report the exact boundary.

Locate the desktop-bundled Codex CLI before using a random PATH version.

Common macOS candidates:

```text
/Applications/ChatGPT.app/Contents/Resources/codex
/Applications/Codex.app/Contents/Resources/codex
```

On Windows, inspect the current user's `LOCALAPPDATA` and `ProgramFiles` for the ChatGPT/Codex
application resources, then fall back to `codex.exe` on PATH. Store the resolved path as
`CODEX_BIN` for this installation session; do not modify global shell configuration.

Run:

```text
"<CODEX_BIN>" --version
"<CODEX_BIN>" login status
```

If the user is not logged in, stop and ask them to complete the normal Codex login. Do not handle credentials.

## 2. Runtime Checks

Required:

- Git 2.30 or newer
- Node.js 20 or newer, available as `node`
- network access to GitHub and OpenAI
- a Codex account with gpt-image-2 access for final image generation

Check:

```text
git --version
node --version
```

If a dependency is missing, ask permission before installing it.

On macOS, when Homebrew is already installed, the standard commands are:

```text
brew install git node@20
```

Do not install Homebrew silently. Without Homebrew, offer the official Git/Xcode Command Line Tools
and Node.js LTS installers and wait for the user.

On Windows, when `winget` is available, the standard commands are:

```text
winget install --id Git.Git --exact
winget install --id OpenJS.NodeJS.LTS --exact
```

These may open platform approval prompts. Wait for completion, then rerun the version checks.

## 3. Inspect Existing State

Run:

```text
"<CODEX_BIN>" plugin marketplace list --json
"<CODEX_BIN>" plugin list --available --json
```

Expected identities:

```text
marketplace: grill-me-jewel
plugin: grill-me-jewel@grill-me-jewel
source: yuyou-dev/GrillMeJewel
```

If the marketplace exists with the official source, continue idempotently. If it points to another
source, stop and report the conflict. If the official plugin is already installed and enabled at the
current version, do not reinstall it unnecessarily.

## 4. Install

When the official marketplace is absent:

```text
"<CODEX_BIN>" plugin marketplace add yuyou-dev/GrillMeJewel --ref v0.1.1 --json
```

Install the core plugin:

```text
"<CODEX_BIN>" plugin add grill-me-jewel@grill-me-jewel --json
```

Do not install any unrelated plugin.

## 5. Verify

Repeat the marketplace and plugin list commands. Confirm the plugin reports:

```text
installed: true
enabled: true
version: 0.1.1
```

Use the marketplace list JSON to find the official marketplace root. From that root run:

```text
node scripts/gmj.mjs doctor --json
```

Accept `restart_required` immediately after installation. `blocked` is not success; report its
checks and recovery step. The doctor verifies Node, Git, one Skill, one Apps UI resource, the plugin
installation, and the MCP registration without reading credentials.

## 6. Restart And New Task

Tell the user to completely quit and reopen Codex Desktop. Then create a new task and use:

```text
请进入 Grill Me 珠宝模式。我只有一个模糊的珠宝想法，请先用 Apps UI 访谈并确认 brief，然后用 gpt-image-2 生成设计图。
```

Success means:

1. `Grill Me 珠宝` appears in the Skill selector.
2. The conversation opens the paged interview form.
3. Submitted answers return to the same task.
4. The agent presents a final brief confirmation.
5. After confirmation, gpt-image-2 returns the requested real design image or an honest permission blocker.

Do not claim a new task was created if the host cannot create one automatically. Give the exact test prompt instead.

## Update

From the configured marketplace root:

```text
node scripts/gmj.mjs update --json
```

This upgrades the official marketplace and refreshes the plugin. Restart Codex and use a new task afterward.

## Uninstall

From the configured marketplace root:

```text
node scripts/gmj.mjs uninstall --json
```

This removes the plugin only. It does not delete conversations, briefs, or generated images. Remove
the marketplace separately only when the user explicitly asks and no other installed component uses it.
