# Jewel Buddy 0.3.4 Release Checklist

Use this checklist once for a GitHub release. It is not an installer and does not create a
recurring task.

## Repository

- [ ] `package.json`, marketplace metadata, plugin manifest, and MCP `serverInfo.version` all say
      `0.3.4`.
- [ ] `.codebuddy-plugin/marketplace.json` is tracked and points to `./plugins/jewel-buddy`.
- [ ] The public plugin contains exactly one Skill: `plugins/jewel-buddy/skills/jewel-buddy`.
- [ ] `git status --short --ignored` shows local `.workbuddy/` and `generated-images/` only as
      ignored data, never as release files.
- [ ] No credential, private path, QA scratch file, old Codex manifest, or generated image is staged.

## Automated gates

Run from the repository root:

```bash
npm run release:check
npm run doctor:workbuddy
codebuddy plugin validate ./plugins/jewel-buddy
```

If `codebuddy` is not on `PATH` on macOS, use the binary bundled with WorkBuddy Desktop. Do not
publish when any gate fails or hangs without a conclusive validation result. If the CLI validator
opens no output and does not terminate, stop that process and run
`/plugin-validate /absolute/path/to/plugins/jewel-buddy` inside WorkBuddy instead. Record the explicit
pass/fail message; an interrupted process is not a pass.

## WorkBuddy smoke test

1. Run `npm run install:workbuddy` and require `npm run doctor:workbuddy` to show the managed MCP as
   healthy with 2/2 tools and 2 resources, the connector as connected, the user Skill as installed,
   and the Apps UI catalog as ready; or test the tagged checkout with `codebuddy --plugin-dir ./plugins/jewel-buddy --serve --open`.
2. Open WorkBuddy's MCP/connector page, enable `jewel-buddy`, then start a new conversation.
3. Send: `用 Jewel Buddy 帮我设计一件送给母亲的吊坠；请用可视化表单逐步确认需求，确认后生成并展示设计图。`
4. Verify four discovery rounds and a separate confirmation round render as inline Apps UI.
5. Verify every assistant turn is UI-first: the card remains visible when deep thinking is collapsed,
   and no question list, answer recap, roadmap, or brief is duplicated before or after the card.
6. Verify every submission produces one short user message, keeps the structured answers out of the
   visible conversation, and automatically advances.
7. Confirm the brief and verify a real image tool returns the requested number of readable images.
8. Verify native image/file presentation completes before `show_jewel_results`; generation,
   presentation, and result UI must not run in one parallel tool batch.
9. Verify the result tool's input phase shows only “正在等待图片数据…”, then its tool-result renders
   the same real image count without ever showing “图片结果不完整”.
10. Run one image-to-image case and drag the comparison divider from 0 to 100; confirm the left/right
   source and result labels match the visible images.

For gray placeholders, stale cards, duplicate connectors, identity mismatches, port conflicts, or
missing image tools, stop and follow [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Publish

- [ ] Update `CHANGELOG.md` and release notes.
- [ ] Commit the reviewed worktree.
- [ ] Tag the exact commit as `v0.3.4` and push the tag.
- [ ] Confirm the GitHub Actions Release workflow passes on macOS and Windows.
- [ ] Download the generated ZIP, verify its SHA-256 file, and inspect the archive contents before
      sharing the release.
