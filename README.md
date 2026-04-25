# pkg-claim

Reserve an npm package name by publishing a minimal stub package.

## Requirements

- Node.js 24+ or Bun
- npm authentication (`npm login`)

If your npm account requires 2FA, security-key, or browser authentication for
publishing, `pkg-claim` lets `npm publish` use the terminal directly so you can
complete npm's prompt during the publish step.

## Usage

Run directly with `npx`:

```bash
npx pkg-claim
```

Preview the flow without publishing:

```bash
npx pkg-claim --dry-run
```

You can also run the built artifact locally:

```bash
node bin/pkg-claim.js --dry-run
bun bin/pkg-claim.js --dry-run
```

## What it does

1. Checks whether the package name is available on npm
2. Prompts for description, license, and author
3. Creates a temporary minimal package
4. Publishes it to npm, or stops before publish in `--dry-run` mode

## Development

```bash
bun install
bun test
bun run typecheck
bun run build
```
