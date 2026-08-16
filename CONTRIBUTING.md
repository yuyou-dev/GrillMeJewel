# Contributing

Contributions that improve beginner-friendly jewelry interviewing, accessible Apps UI behavior,
prompt quality, portability, tests, or documentation are welcome.

## Development

1. Fork and clone the repository.
2. Use Node.js 20 or newer.
3. Keep the plugin standalone and preserve its one-Skill scope.
4. Run `npm test`, `npm run scan:public`, and `npm run doctor`.
5. Do not commit generated images, real conversations, credentials, local paths, or private assets.

Changes to question logic should demonstrate that established facts are not asked again and that a
round never exceeds four fields. UI changes must preserve keyboard access, terminal loading/error
states, stable answer ids, and the no-nested-scroll layout.

By contributing, you agree that your contribution is licensed under Apache-2.0.
