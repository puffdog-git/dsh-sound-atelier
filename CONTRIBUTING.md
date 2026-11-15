# Contributing

Use Node.js 22.15 or newer and an isolated checkout. Follow all dependency steps in INSTALL.md, including peer installation for local links and the explicit FFmpeg installer. The initial legacy-peer-deps step alone does not provide all host imports. Do not run integration smoke scripts against a live user's data.

Edit lib/client-src/, then run `npm run build:client`; do not edit the generated client directly. Run `npm test`, `npm run check:client`, and `npm run check:release`. Python dependencies and extra checks are described in INSTALL.md. External-account and human-listening validation are separate from unit tests.

Preserve upstream copyright and license notices. Keep internal service IDs and documented legacy routes compatible. Avoid committing generated logs, recordings, downloaded models, secrets or local host settings. See SECURITY.md and RELEASE.md before distributing a snapshot.
