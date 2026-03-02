# Distribution Without npm

This document explains how to distribute `hwpxtool` without publishing to npm.

## Option 1: GitHub Source Install (Fastest)

Use this when you want users to start immediately.

```bash
git clone https://github.com/reallygood83/hwpx-cli.git
cd hwpx-cli
pnpm install
pnpm --filter @masteroflearning/hwpxcore build
pnpm --filter @masteroflearning/hwpx-tools build
pnpm --filter @masteroflearning/hwpx-cli build
node packages/hwpx-cli/dist/cli.js --help
```

To make command usage easier:

```bash
alias hwpxtool='node /absolute/path/to/hwpx-cli/packages/hwpx-cli/dist/cli.js'
```

## Option 2: GitHub Release Artifact

Use this for user-friendly binary/script downloads.

Recommended artifact layout:

- `hwpxtool-darwin-arm64.tar.gz`
- `hwpxtool-darwin-x64.tar.gz`
- `hwpxtool-linux-x64.tar.gz`

Each artifact should include:

- `bin/hwpxtool` launcher script
- built JS runtime files
- README with quick commands

## Option 3: Homebrew Tap

Use this for one-command installation on macOS.

```bash
brew tap masteroflearning/hwpxtool
brew install hwpxtool
```

Recommended sequence:

1. Upload release artifact first
2. Create Homebrew formula referencing the release SHA256
3. Test install on clean machine

## Recommended Path Right Now

1. Start with Option 1 immediately
2. Add Option 2 (release artifact) for broader users
3. Add Option 3 (brew tap) after release artifact is stable
