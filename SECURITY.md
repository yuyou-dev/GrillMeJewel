# Security Policy

## Supported Version

Security fixes are applied to the latest published release.

## Report A Vulnerability

Open a private GitHub security advisory for `yuyou-dev/GrillMeJewel`. Do not include credentials,
private conversations, or designer assets in a public issue.

## Security Model

- The marketplace plugin uses a local stdio MCP. The connector preview uses a user-level managed HTTP
  MCP bound only to `127.0.0.1`; both return the same inline Apps UI resources.
- It has no hosted backend, database, telemetry, or project-owned authentication.
- The MCP server does not read WorkBuddy credentials or configuration. The installer reads only the
  MCP registration and its own managed Skill marker so it can update safely without overwriting others.
- It does not request API keys. Image generation uses a tool already authorized in WorkBuddy.
- Interview answers return only to the active conversation through one `ui/message` submission.

Install only from the official GitHub repository and verify release checksums when using archives.
