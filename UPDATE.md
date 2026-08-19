# Update GrillMeJewel

This permanent Runbook migrates an existing official GrillMeJewel installation to the fixed release
`v0.2.0`. Read it completely before changing the machine. If the plugin is not installed, stop and
follow [INSTALL.md](INSTALL.md).

## Safety rules

- Continue only in local Codex Desktop on macOS or native Windows.
- Use the desktop-bundled Codex CLI and inspect JSON state before mutation.
- Accept only marketplace `grill-me-jewel` from `yuyou-dev/GrillMeJewel`; stop on any same-name,
  different-source conflict.
- Do not edit Codex configuration by hand, inspect credentials, or delete conversations, briefs,
  images, or other user work.
- Clone and run the exact `v0.2.0` release updater. Do not execute an updater directly from `main`.

## 1. Inspect state and prerequisites

Resolve `<CODEX_BIN>` using [INSTALL.md](INSTALL.md#1-host-gate), then run:

```text
"<CODEX_BIN>" --version
"<CODEX_BIN>" login status
"<CODEX_BIN>" plugin marketplace list --json
"<CODEX_BIN>" plugin list --available --json
```

Confirm the official source and record the version of `grill-me-jewel@grill-me-jewel`. If the plugin
is absent, follow INSTALL.md. Require Git 2.30+, Node.js 20+, Codex login, and GitHub network access;
ask before installing a missing system dependency.

## 2. Clone the exact updater

macOS:

```text
UPDATE_ROOT="$(mktemp -d -t grill-me-jewel-update)"
git clone --depth 1 --branch v0.2.0 https://github.com/yuyou-dev/GrillMeJewel.git "$UPDATE_ROOT"
git -C "$UPDATE_ROOT" describe --tags --exact-match
```

Windows PowerShell:

```text
$UPDATE_ROOT = Join-Path ([System.IO.Path]::GetTempPath()) ("grill-me-jewel-update-" + [guid]::NewGuid())
git clone --depth 1 --branch v0.2.0 https://github.com/yuyou-dev/GrillMeJewel.git $UPDATE_ROOT
git -C $UPDATE_ROOT describe --tags --exact-match
```

Continue only when the exact tag is `v0.2.0` and `package.json` reports `0.2.0`.

## 3. Run the transactional update

macOS:

```text
GMJ_CODEX_BIN="<CODEX_BIN>" node "$UPDATE_ROOT/scripts/gmj.mjs" update --json
```

Windows PowerShell:

```text
$env:GMJ_CODEX_BIN = "<CODEX_BIN>"
node "$UPDATE_ROOT\scripts\gmj.mjs" update --json
```

The result exposes `fromVersion`, `toVersion`, `migration`, `restoredPlugins`, and `rolledBack`.
The updater replaces the old fixed release ref with `v0.2.0`, restores the single plugin, and
verifies its version. On failure it attempts to restore the previous ref and plugin, returns
`blocked`, and reports the rollback outcome. Do not issue ad-hoc replacement commands after a
blocked result.

## 4. Verify, clean up, and restart

```text
node "<UPDATE_ROOT>/scripts/gmj.mjs" doctor --json
"<CODEX_BIN>" plugin marketplace list --json
"<CODEX_BIN>" plugin list --available --json
"<CODEX_BIN>" mcp get grill_me_jewel_ui --json
```

Confirm `grill-me-jewel@grill-me-jewel` is installed and enabled at `0.2.0`, and doctor is `ready`
or `restart_required`. Delete only the temporary checkout. Fully quit and reopen Codex Desktop,
then use a **new task**; the task that performed the update cannot be treated as hot-loaded.
