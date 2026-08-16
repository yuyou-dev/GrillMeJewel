# Security Policy

## Supported Version

Security fixes are applied to the latest published release.

## Report A Vulnerability

Open a private GitHub security advisory for `yuyou-dev/GrillMeJewel`. Do not include credentials,
private conversations, or designer assets in a public issue.

## Security Model

- The plugin uses a local stdio MCP and an inline Apps UI resource.
- It has no hosted backend, database, telemetry, or project-owned authentication.
- It does not read or copy Codex credential/configuration files.
- It does not request API keys. gpt-image-2 uses the user's existing Codex session.
- Interview answers return only to the active conversation through the host Apps UI protocol.

Install only from the official GitHub repository and verify release checksums when using archives.
