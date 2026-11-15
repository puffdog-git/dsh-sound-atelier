# Release checklist — v1.0.0

Maintainer: puffdog-git. The package is ready to publish; publishing itself is a manual step done by the maintainer.

## Before publishing

1. Work from a clean source snapshot (source, tests, build inputs, docs, licence notices, lockfile). Never publish an installed plugin folder, and never include `data`, `.venv`, `node_modules` or private test logs.
2. Run `npm test`, `npm run check:client` and `npm run check:release`. For Discord-cyberfriend also run the Python tests.
3. Run `npm pack --dry-run --json` and read the file list. Check it for credentials and personal data.
4. Version in `package.json` and `package-lock.json` must match.

## Publishing

1. Create the public GitHub repository and push the clean source. Add the `dsh-plugin` topic to the repository.
2. Add `repository`, `homepage` and `bugs` to `package.json` once the repository URL exists. Do not invent a URL beforehand.
3. `npm publish` from the clean source.
4. To appear in the plugin market, open a pull request to [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md) adding one file `data/plugins/<owner>__<repo>.yml`. The repository must be at least one day old, and the description must state plainly what the plugin does, without superlatives.

## What was verified for a market-style install

On 2026-11-15, both packages were packed with `npm pack` and installed from the tarballs into a fresh, isolated DSH 0.2.2-rc.2 web profile on Windows with `dsh plugin add`. Both loaded, their APIs answered, FFmpeg was downloaded automatically on first start, plugin data was written under `~/.dsh/data` and not inside `node_modules`, and the Discord personal-account Python environment was created in the data folder and found by the plugin.

Not verified: installing from the real npm registry or through the market UI (neither is possible before publication), other operating systems, a fresh operating-system image, and paid speech providers. YouTube requests download the yt-dlp executable from its official release page on first use (verified on Windows with a real download and search); playing a whole track to the end has not been verified.
