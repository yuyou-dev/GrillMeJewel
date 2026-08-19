# Architecture

## Components

- Git marketplace: `.agents/plugins/marketplace.json`
- Plugin manifest: `plugins/grill-me-jewel/.codex-plugin/plugin.json`
- Skill: `plugins/grill-me-jewel/skills/grill-me-jewel/`
- Local stdio MCP: `plugins/grill-me-jewel/mcp/server.mjs`
- Apps UI: `plugins/grill-me-jewel/mcp/interview.html`
- Lifecycle doctor: `scripts/gmj.mjs`

The public marketplace is pinned to a release tag. `UPDATE.md` runs the next tag's bundled updater,
which records the current version, replaces the fixed ref, reinstalls the single plugin, verifies
the target, and restores the previous tag if migration fails. It does not touch conversations,
briefs, generated images, or other user files.

## Data Flow

```text
vague user idea
  -> Grill Me Jewel Skill identifies unresolved decisions
  -> ask_grill_me_questions returns structuredContent
  -> sandboxed Apps UI shows one question at a time
  -> ui/message writes stable answer ids into the same conversation
  -> Skill assembles and confirms the brief
  -> Codex gpt-image-2 generates real design image assets
```

The MCP never generates images and never receives provider credentials. It creates a local HTML
resource and transports form data over MCP Apps UI JSON-RPC. The conversation remains the interview
state; no server database or cache is used.

## Protocol Boundary

- Outer stdio MCP: `2025-11-25`, newline-delimited JSON, logs never written to stdout.
- Apps UI iframe: `2026-01-26`, JSON-RPC over `window.postMessage`.
- Resource MIME: `text/html;profile=mcp-app`.
- Resource URI: `ui://grill-me-jewel/interview/v3.html`.

Breaking UI changes use a new resource URI. The form returns readable summaries plus stable JSON;
it does not return HTML pretending to be an interactive host component.

## Privacy

The plugin reads no credential files, does not require an API key, and sends no interview data to a
project-owned service. Final image generation uses the user's existing Codex session and OpenAI
permissions. The repository public scan covers source content, file names, and Git identities.
