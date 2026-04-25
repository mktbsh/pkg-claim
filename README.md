# pkg-claim

Reserve an npm package name by publishing a minimal stub package.

## Requirements

- Node.js 24+ for the built CLI, or Bun for local development
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
bun run check
```

Create a changeset for user-facing changes before merging to `main`:

```bash
bun run changeset
```

## Release process

1. Run `bun run changeset` in a feature branch and commit the generated `.changeset/*.md` file.
2. Merge the feature PR into `main`.
3. GitHub Actions opens or updates a release PR with the pending version bump.
4. Merge that release PR to publish `pkg-claim` to npm automatically.

The publish workflow uses npm Trusted Publishing from GitHub Actions, so npm
must be configured to trust this repository before the first automated release.
