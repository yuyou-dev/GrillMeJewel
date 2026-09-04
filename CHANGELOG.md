# Changelog

## 0.3.4 - 2026-09-04

- Fixed a result lifecycle race where WorkBuddy's path-only tool-input was mistaken for the completed
  gallery and briefly showed “图片结果不完整” before the real tool-result delivered image data.
- Result UI now shows a neutral waiting state for tool-input and renders images only from the validated
  tool-result. The result resource cache boundary is now `results/v5.html`.
- Required every result item to supply a real path or image data URI at schema level, while retaining
  the existing file, MIME, size, and embedded-data validation.
- Enforced serial delivery: image generation must finish, then WorkBuddy native image/file presentation
  must succeed, and only then may `show_jewel_results` open the final UI. These steps must never share a
  parallel tool-call batch.

## 0.3.3 - 2026-09-04

- Made the Apps UI card the primary visible response for every interview and result turn. The Skill
  and tool descriptions now require calls from a normal visible assistant response and immediate
  turn completion, without duplicating questions, answers, roadmaps, briefs, or galleries in prose.
- Moved full widget submissions to `ui/update-model-context`. The visible `ui/message` is now one
  short continuation sentence, while stable ids, display labels, and answers remain available to the
  next model call without filling the conversation with internal JSON or answer summaries.
- Bumped the interview and result resource cache boundaries to `interview/v5.html` and
  `results/v4.html`, so WorkBuddy cannot reuse the earlier widget template after upgrade.
- Added regression coverage for visible-call placement instructions, post-UI silence, compact widget
  messages, and the WorkBuddy model-context bridge.

## 0.3.2 - 2026-09-03

- Fixed a false-green installer check where the stdio MCP and Skill were healthy but WorkBuddy's
  Apps catalog had not loaded either Jewel Buddy UI tool, leaving a permanent gray pending card.
- Replaced the connector-preview stdio transport with a loopback HTTP MCP managed by the user's
  operating system. This matches the Apps catalog path that WorkBuddy 5.4.7 actually inspects while
  eliminating the terminal-lifetime `ECONNREFUSED 127.0.0.1:39528` failure.
- Added an Apps catalog diagnostic gate. `npm run doctor:workbuddy` now requires the MCP handshake,
  installed Skill, the exact 2/2 tools plus 2 resources, and both inline UI apps before reporting the
  installation ready.
- Added the MCP `resources/templates/list` response expected by WorkBuddy's Apps inspector.
- Made the initial desktop-host restart boundary explicit: trust and enable the connector, fully
  quit/reopen WorkBuddy once, then run doctor and test in a new conversation. Connector mode does not use
  `/reload-plugins` and never falls back to native conversation cards.

## 0.3.1 - 2026-09-03

- Added an idempotent WorkBuddy connector installer and health check that register the local MCP over
  stdio through WorkBuddy's own CLI and desktop configuration directory, install the bundled user
  Skill, and verify both surfaces.
- Added double-click installers for macOS and Windows. After the one-time setup, users can manage
  `jewel-buddy` from the WorkBuddy MCP/connector switch without running a localhost backend.
- Replaced the preview install source with the exact `Teresa1228/GrillMeJewel` WorkBuddy branch so
  testers do not accidentally install the upstream Codex-only `main` release.
- The installer automatically replaces only the known dead `127.0.0.1:39528` registration and
  refuses to overwrite an unknown same-name connector.
- Required every field id and option value to begin with a lowercase letter (`gold_18k`, not
  `18k_gold`) so the first WorkBuddy tool call cannot fail schema validation and leave a gray pending
  card.
- Stopped the interview on Apps UI discovery or rendering failure instead of falling back to native
  conversation cards or prose questions.
- Added regression checks for stdio-only registration, installer idempotency, branch-pinned public
  instructions, and the exact plugin MCP manifest.

## 0.3.0 - 2026-09-03

- Published Jewel Buddy as a standalone WorkBuddy / CodeBuddy marketplace plugin.
- Unified plugin, MCP server, tool, and `ui://` resource identity as `jewel-buddy`.
- Added the WorkBuddy MCP Apps bridge for initialization, tool-result delivery, resize events, and
  one-message answer submission.
- Updated the interview to `ui://jewel-buddy/interview/v4.html` and aligned its visual language with
  the public GrillMeJewel reference UI.
- Added a zero-dependency localhost HTTP diagnostic mode without changing the default stdio plugin
  transport.
- Added `show_jewel_results`, a presentation-only MCP App that renders generated designs in a result
  gallery and provides a draggable source/result comparison for image-to-image work.
- Fixed result cards that reported an incomplete image even though the main conversation showed the
  generated file. WorkBuddy delivers only `structuredContent` to the Apps iframe, so the result
  payload includes bounded image data there while preserving standard MCP image content for native
  display.
- Fixed result-card metadata and controls being clipped by WorkBuddy's iframe height cap. Result UI
  v3 uses a bounded image stage and omits the disabled navigation row for single-image results.
- Allowed interview option values to begin with a digit (for example `18k_gold`) while keeping
  question and result ids letter-prefixed. This prevents a rejected first tool call from appearing
  as a transient gray placeholder before the model retries with a renamed value.
- Restored the official animated header in the same README location used by the Codex release; the
  runtime interview UI remains unbranded, matching the upstream layout.
- Verified all four discovery rounds, the separate confirmation round, and a real image result in
  WorkBuddy Desktop.

## Historical Codex releases

The entries below describe the repository before the WorkBuddy `0.3.0` port. Their retired Codex
installer and manifest are not part of the current WorkBuddy package.

### 0.2.0 - 2026-08-19

- Expanded Grill Me into four required discovery stages plus separate brief confirmation.
- Added an explicit 1/2/4/8/custom delivery-count choice instead of silently defaulting to one image.
- Added a candidate-distance matrix so multi-image delivery changes at least three visible design axes per direction.
- Versioned the staged interview resource as `interview/v3.html` to avoid stale host caches.
- Added a permanent one-prompt update Runbook with fixed-release migration, observable version fields, and verified rollback.

### 0.1.1

- Refined the public README with a real Apps UI image, clearer workflow, and platform guidance.
- Added official 苏哇科技 brand assets and plugin icon metadata.
- Versioned the branded interview resource as `interview/v2.html` to avoid stale host caches.

### 0.1.0

- Initial standalone `grill-me-jewel` Skill.
- Compact single-question Apps UI for multi-round jewelry interviews.
- Final confirmed brief and Codex gpt-image-2 generation contract.
- Git marketplace with macOS and native Windows lifecycle checks.
- Public release, privacy, package, MCP, and cross-platform CI tests.
