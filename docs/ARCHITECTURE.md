# Architecture

## Components

- WorkBuddy plugin manifest: `plugins/jewel-buddy/.codebuddy-plugin/plugin.json`
- Skill: `plugins/jewel-buddy/skills/jewel-buddy/`
- Local MCP (stdio and loopback HTTP): `plugins/jewel-buddy/mcp/server.mjs`
- Apps UI: `plugins/jewel-buddy/mcp/interview.html`
- One-click WorkBuddy connector installer: `scripts/workbuddy-connector.mjs`
- User-level service definitions: `scripts/managed-mcp-service.mjs`
- Local verification: `npm run doctor`

The current GitHub preview registers the same MCP server as a user-level loopback HTTP connector
through WorkBuddy's own CLI. macOS LaunchAgent, Windows login startup, or Linux systemd user service
owns its lifecycle, so users do not keep a terminal open. This transport is intentional: WorkBuddy
5.4.7 can call a custom stdio MCP from a conversation but does not add that connector to the Apps UI
catalog. During plugin development, WorkBuddy can instead load the plugin with
`codebuddy --plugin-dir ./plugins/jewel-buddy --serve`; the two modes must not be enabled together.
The package does not modify conversations, briefs, generated images, or other user files.

## Data Flow

```text
vague user idea
  -> Jewel Buddy Skill identifies unresolved decisions
  -> ask_grill_me_questions returns structuredContent
  -> sandboxed Apps UI shows one question at a time
  -> ui/update-model-context preserves structured answers; ui/message sends one short continuation
  -> Skill assembles and confirms the brief
  -> WorkBuddy invokes an available real image-generation tool
  -> WorkBuddy completes native image/file presentation
  -> Skill passes verified localPath values to show_jewel_results only after native presentation
  -> a new Apps UI result card renders a gallery or before/after slider
```

The MCP never generates images, uploads them, or receives provider credentials. The result tool only
reads explicitly supplied PNG/JPEG/WebP files or data URIs after generation succeeds. It returns
standard MCP image content for native conversation rendering and the same bounded image bytes in
`structuredContent` for WorkBuddy's Apps iframe, which currently omits image content blocks from its
tool-result notification. It does not persist a copy. The conversation remains the interview state;
no server database or cache is used.

## Protocol Boundary

- Outer MCP: `2025-11-25`; the preview connector uses stateless loopback HTTP at
  `http://127.0.0.1:39528/mcp`, while the marketplace plugin uses newline-delimited stdio.
- Apps UI iframe: `2026-01-26`, JSON-RPC over `window.postMessage`.
- Resource MIME: `text/html;profile=mcp-app`.
- MCP server identity and URI authority: `jewel-buddy`.
- Interview resource URI: `ui://jewel-buddy/interview/v5.html`.
- Result resource URI: `ui://jewel-buddy/results/v5.html`.

The verified interview is `interview/v5`; the result surface is `results/v5` so WorkBuddy cannot
reuse an earlier content-index-only, oversized, or input-before-result gallery. A generated image tool result is not broadcast to an
older interview iframe. `show_jewel_results` therefore creates a new result card in the same
conversation, which is the reliable MCP Apps tool-result model.

## Privacy

The plugin reads no credential files, does not require an API key, and sends no interview data to a
project-owned service. Final image generation uses a tool already available and authorized in the
user's WorkBuddy session. The repository public scan covers source content, file names, and Git identities.
