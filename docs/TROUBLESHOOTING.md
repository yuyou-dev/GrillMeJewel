# Troubleshooting

## First check: the four identities

The plugin name, MCP key, `serverInfo.name`, and `ui://` authority must all be `jewel-buddy`.
Aliases such as `grill-me-jewel`, `wb_jewelry_ui`, or `jewel_buddy_ui` can leave the renderer on a
gray placeholder because the host cannot associate the tool with its UI Resource.

`ui://jewel-buddy/interview/v5.html` is a resource identifier, not a network address. Never add
`http://` to it. Only an HTTP MCP backend uses `http://127.0.0.1:39528/mcp`.

## Skill is not visible

Run `codebuddy plugin validate ./plugins/jewel-buddy`, then start with
`codebuddy --plugin-dir ./plugins/jewel-buddy --serve`. In the Skill picker search for
`Jewel Buddy` or call `/jewel-buddy:jewel-buddy`.

If `codebuddy` is not on `PATH` on macOS, use the CLI bundled in WorkBuddy Desktop:

```text
/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/cli/bin/codebuddy
```

If `codebuddy plugin validate` produces no output and does not terminate, interrupt that process
and run `/plugin-validate /absolute/path/to/plugins/jewel-buddy` in WorkBuddy. Both routes perform
plugin validation. Require an explicit pass/fail result; a hung or interrupted command is
inconclusive, not successful.

## MCP connector is missing after downloading the GitHub branch

Downloading or pushing source code does not register a connector. From the checked-out
`codex/workbuddy-port` branch run:

```bash
npm run install:workbuddy
```

The installer explicitly targets WorkBuddy's `~/.workbuddy` profile, installs a user-level managed
HTTP service on `127.0.0.1`, and registers its URL. It also installs the repository's only Skill under
`~/.workbuddy/skills/jewel-buddy/`. Open **连接器 → 自定义连接**, trust and enable `jewel-buddy`, then
fully quit and reopen WorkBuddy once. Back in the install directory run `npm run doctor:workbuddy`.
Success requires managed MCP `✓ Healthy (2/2 tools, 2 resources)`, connector `✓ Connected`, Skill
`✓ Installed`, and Apps UI catalog `✓ Ready`; the first item is the automated equivalent of the
connector panel's “2/2 tools enabled, 2 resources”. A generic “added” message or MCP handshake alone
is not enough. Then use a new conversation.

If WorkBuddy's CLI does not return within 45 seconds, the installer stops with an explicit timeout
instead of leaving the installation window hanging. Check WorkBuddy and network status, then retry.

Do not add the GitHub `/tree/codex/workbuddy-port` page as a marketplace or MCP URL. It is a browser
page. WorkBuddy 2.132 also passes a Git URL `#branch` fragment directly to `git clone`, so the current
preview uses the checked-out branch plus the managed HTTP connector installer. After the PR reaches upstream
`main`, migrate to the marketplace package and remove the preview connector first.

## Questions appear as plain text

Apps UI renders only in WorkBuddy Web UI or an IDE-embedded Web UI. Terminal TUI and print mode
cannot render this interview. Stop the interview instead of continuing with native conversation
cards or prose questions. In Web UI, verify the connector is trusted and enabled, then start a new
conversation. Run `/reload-plugins` only when testing the marketplace/plugin mode.

## Form stays on loading or becomes a gray rectangle

The widget reports a terminal error after nine seconds when `ui/initialize` fails. If it remains a
360px gray `pending_placeholder`, check these in order:

1. Run `npm run doctor:workbuddy`. If MCP and Skill pass but Apps UI catalog fails, the gray block is
   a host placeholder: the tool result was buffered before WorkBuddy associated the tool with its UI.
2. Fully quit and reopen WorkBuddy. Closing only the window does not rebuild the Apps catalog.
   Then use **连接器 → 自定义连接** to turn `jewel-buddy` off and on, and test in a new conversation.
3. Confirm the plugin manifest contains `"mcpServers": "./.mcp.json"`.
4. Confirm only one `jewel-buddy` connector is enabled. Plugin stdio and a manual global connector
   must not run together.
5. Run `/reload-plugins` only for Marketplace/plugin mode, then test in a new conversation; an
   old card never hot-reloads. Connector preview mode uses a full WorkBuddy restart instead.
6. Confirm Node.js is version 20 or newer and the plugin process can read `mcp/interview.html`.

The installed connector should never require a terminal. First run `npm run doctor:workbuddy`; if the
managed MCP is not `✓ Healthy`, rerun `npm run install:workbuddy` to recreate and restart its user-level
service. For a temporary developer-only foreground trace, stop the managed service first, then run:

```bash
npm run serve:http
curl -sS http://127.0.0.1:39528/health
```

The health response must report `ok: true`, `name: jewel-buddy`, and the current version. Configure
one manual WorkBuddy connector with URL `http://127.0.0.1:39528/mcp`, then disable the plugin's
same-name stdio connector for that test. Closing the terminal stops this foreground backend. If startup reports
`EADDRINUSE`, another process owns port `39528`; stop that known process or choose another port and
use the matching connector URL.

There is no separate Widget frontend server: `resources/read` returns the HTML, while stdio or HTTP
is only the MCP backend transport.

## First card is gray, then the model retries and succeeds

This usually means the first tool call failed schema validation before WorkBuddy received a Widget
result. The gray area is the pending tool placeholder, not a rendered blank page. Earlier builds
required every option value to start with a letter, so a natural value such as `18k_gold` failed and
the model retried as `gold_18k`.

Current builds require field ids, option values, and result item ids to start with a lowercase
letter. Use `gold_18k`, never `18k_gold`. After updating, restart the development server when
applicable and verify in a new conversation. Run `/reload-plugins` only for marketplace/plugin mode;
the connector installer does not require it. Do not rely on automatic retry as the normal rendering
path and do not replace the failed Apps UI with a native conversation card.

## Form submits but the interview does not continue

Confirm the host supports both `ui/update-model-context` and `ui/message`. The widget first sends the
complete structured submission as model context, then sends one short visible message with
`_meta['codebuddy.ai/sendMessageMode'] = 'send'`. A successful form click that only fills the composer
indicates the host did not honor send mode. The main conversation should not display raw JSON or a
second copy of the answers.

## Apps UI appears inside collapsed deep thinking

The card follows the WorkBuddy timeline position of its tool call. Jewel Buddy requests an inline
Apps surface, but MCP metadata does not provide a separate “outside reasoning” placement switch.
Current prompts require the tool call to be the first item in a normal visible assistant response,
with no prose preamble, and require the turn to end as soon as the card opens.

Test this in a new conversation after reinstalling. If the first live card is still grouped under
deep thinking but becomes visible after reopening the conversation, record the WorkBuddy version and
report it as a host rendering race: the plugin cannot rebuild the host's already-created fold tree.
Do not work around it by replacing the Apps UI with native cards or by repeating the questions in
prose.

## Image generation does not start

The final brief must be explicitly confirmed first. Image generation belongs to the WorkBuddy main
conversation, not to the local MCP server or iframe. Confirm an image tool is installed and allowed
in the current session. Missing permission, network access, or tool availability must be reported
honestly; do not add an API key to Jewel Buddy and do not treat a text brief as an image result.

## Image exists in chat but the result gallery is missing

The image generator and Jewel Buddy are separate tools. After a successful ImageGen call, the main
conversation must read the returned `images[].localPath`, finish native image/file presentation, and
only then call `show_jewel_results` once. Never run generation, native presentation, and the result UI
in parallel or in the same tool-call batch. The
result tool accepts only real PNG, JPEG, or WebP content from an absolute local path or a `data:` URI.

If the result card first says that image data is missing and the image appears later, update to
`ui://jewel-buddy/results/v5.html`. WorkBuddy sends tool-input before tool-result: input contains only
paths, while the result contains validated image bytes. Result UI v5 treats input as a waiting state
and renders the gallery only after the real tool-result arrives.

The original interview card will not turn into a gallery: WorkBuddy pushes a tool result only to the
widget associated with that tool call. A second, visually consistent result card should appear in the
same conversation. If the image tool returned only a host-private attachment or remote URL, keep the
native chat image; do not convert a guessed URL or path into a fake gallery result.

For image-to-image mode, every item requires both `source_path` and `result_path`. A missing source,
unsupported format, file larger than 12 MiB, or inline gallery larger than 1.5 MiB is rejected. The
1.5 MiB total includes source and result images because WorkBuddy currently forwards only
`structuredContent` to the Apps iframe; duplicating bounded image data there is what keeps the result
card from becoming a gray or incomplete placeholder. Use the native chat display for oversized or
unsupported inputs rather than weakening the file checks.

## Result image is visible but the title or controls are clipped

Update to the build that exposes `ui://jewel-buddy/results/v5.html`, run `/reload-plugins` once, and
create a new result card. Result UI v5 reports the maximum body/document content size instead of the
current iframe viewport, bounds the image stage, and omits the disabled navigation row for a
single-image result. Existing v1/v2 cards are immutable and will remain clipped.

## Reload does not pick up changes

Run `/reload-plugins` only after installation, update, or source changes, then start a new
conversation. If developing with `--plugin-dir`, stop and restart that process when the old MCP
remains registered. After changing an existing Widget contract, increment that resource URI and
update its tests/docs so the host cannot reuse cached HTML. The interview remains
`interview/v5.html`; the result gallery has its own cache boundary at `results/v5.html`.

## Plugin name conflict

If another installed plugin already uses `jewel-buddy`, use `--plugin-dir` to test this checkout;
the local plugin takes precedence for that session. Rename, disable, or uninstall a connector only
after the user chooses which installation to keep.
