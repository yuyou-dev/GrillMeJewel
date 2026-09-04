# AGENTS.md

## Project Role

Jewel Buddy is a standalone WorkBuddy / CodeBuddy plugin. It turns vague jewelry ideas into
confirmed briefs through an MCP Apps interview, then asks the main conversation to use an available
image-generation tool.

## Boundaries

- Keep the public package independent. Do not add dependencies on another jewelry repository or plugin.
- The public plugin contains exactly one Skill.
- The local MCP is presentation and answer-return only. It must not store conversations, upload files,
  call image providers, or impersonate successful image generation.
- Image generation happens only after the user confirms the brief and the WorkBuddy main conversation
  invokes a real available image-generation tool.
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

Validate the plugin with `codebuddy plugin validate ./plugins/jewel-buddy`. A release requires an
Apps UI submission test in WorkBuddy Web UI and a real image-tool smoke test.
