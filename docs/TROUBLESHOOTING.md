# Troubleshooting

## Skill is not visible

Run `codex plugin list --json` and confirm `grill-me-jewel@grill-me-jewel` is installed and enabled.
Completely restart Codex and create a new task. In the Skill picker search for `Grill Me 珠宝` or
`grill-me-jewel`.

## Questions appear as plain text

The Skill loaded but the Apps UI MCP probably did not. Run `node scripts/gmj.mjs doctor --json` from
the configured marketplace root. A newly installed MCP requires a full restart and a new task.

## Form stays on loading

The UI changes to a terminal error after nine seconds. Retry the form call in the same task. If the
error repeats, verify `grill_me_jewel_ui` is enabled and that the installed version matches the
marketplace version.

## Form submits but the interview does not continue

Confirm the host supports `ui/message`. Preserve the submitted answer summary shown in the task and
ask Codex to continue the next unresolved Grill Me round without repeating established facts.

## Image generation does not start

The final brief must be explicitly confirmed first. If it was confirmed, ask Codex to use
`$imagegen` / gpt-image-2 with that brief. Missing account permission or network access must be
reported honestly; the plugin does not accept an API key as a workaround.

## Marketplace conflict

Do not overwrite an existing marketplace named `grill-me-jewel` that points to another source.
Report its source and let the user decide whether to remove or rename the conflicting installation.

## Update is blocked or rolled back

Use the permanent [UPDATE.md](../UPDATE.md) Runbook rather than `marketplace upgrade` alone. Read the
updater JSON fields `fromVersion`, `toVersion`, `restoredPlugins`, and `rolledBack`. When rollback is
true, the previous version was restored and remains usable after restart. When false, stop and report
the recorded actions and error; do not edit plugin caches or marketplace configuration by hand.
