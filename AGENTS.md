# AGENTS.md

## Project Role

GrillMeJewel is a standalone public Codex plugin. It turns vague jewelry ideas into confirmed briefs
through an Apps UI interview and then generates real design images with Codex gpt-image-2.

## Boundaries

- Keep the public package independent. Do not add dependencies on another jewelry repository or plugin.
- The public plugin contains exactly one Skill: `grill-me-jewel`.
- The local MCP is presentation and answer-return only. It must not store conversations, upload files,
  call image providers, or impersonate successful image generation.
- Image generation happens only after the user confirms the brief and uses Codex `$imagegen` / gpt-image-2.
- Never add credentials, local user paths, private URLs, task links, designer materials, generated
  artifacts, caches, or private Git history.
- Do not add a database, hosted service, external authentication, or runtime package installation.

## Verification

Run the smallest relevant checks, and before publication run all of:

```text
npm test
npm run scan:public
npm run doctor
```

Validate the plugin manifest and Skill with the official local validators. A release requires macOS
and Windows CI, archive checksum verification, isolated remote installation, Apps UI submission,
and a real gpt-image-2 smoke test.
