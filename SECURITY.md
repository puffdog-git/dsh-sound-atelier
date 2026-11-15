# Security and private data

Maintainer: [puffdog-git](https://github.com/puffdog-git).

Do not include tokens, API keys, cookies, recordings, chat history, session IDs, personal Discord IDs, or full settings in public issues. Share a minimal reproduction with invented data and redacted errors. This fork has no dedicated private vulnerability reporting channel configured yet; do not publish an exploitable vulnerability with credentials while arranging private contact.

The npm `files` allowlist and `.gitignore` serve different purposes. Always inspect both the clean source snapshot and `npm pack --dry-run --json`. Never upload the installed plugin directory, the DSH profile, `.dsh`, `data`, virtual environments, or development backups wholesale. Even encrypted credentials remain private. If a secret was exposed, revoke it at its provider; deleting a file does not remove earlier copies.

Tests use invented credentials and fake private-key markers; those are fixtures. Automated pattern checks cannot prove absence of every secret. Review additions before release. Optional cloud synthesis and voice enrollment send the explicitly selected text or reference audio to that provider. Use recordings and models you have permission to use.
