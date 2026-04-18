# npx Runtime Compatibility Design

## Problem

`pkg-claim` is currently published as a Bun-first TypeScript CLI with `src/cli.ts` as the `bin` entrypoint. That works when Bun is installed, but it does not satisfy the desired distribution model:

- `npx pkg-claim` should work
- the published entrypoint should be bundled and minified JavaScript under `bin/`
- the same published JavaScript should run under both Node and Bun
- runtime behavior must not require Bun-specific APIs

## Goal

Publish `pkg-claim` as a Node-compatible bundled CLI while keeping the source implementation in TypeScript.

## Non-Goals

- keeping Bun-specific runtime APIs in the execution path
- shipping TypeScript as the published CLI entrypoint
- making the tool Node-only
- redesigning the interactive CLI flow

## Recommended Approach

Use `tsdown` to bundle and minify `src/cli.ts` into `bin/pkg-claim.js`, then publish that generated JavaScript as the package executable.

This keeps the source code readable and maintainable in `src/`, while producing a single runtime artifact suitable for `npx`, `node`, and `bun`.

## Architecture

### Source Layout

- `src/cli.ts` remains the CLI entry module in source form
- `src/registry.ts` remains responsible for npm registry availability checks
- `src/scaffold.ts` remains responsible for temporary package generation
- `src/publish.ts` remains responsible for invoking `npm publish`
- `bin/pkg-claim.js` becomes the generated bundled executable

### Build Output

- bundler: `tsdown`
- input: `src/cli.ts`
- output: `bin/pkg-claim.js`
- output characteristics:
  - bundled
  - minified
  - executable JavaScript
  - compatible with Node 24+
  - also runnable by Bun

### Package Configuration

`package.json` will be updated so that:

- `bin.pkg-claim` points to `./bin/pkg-claim.js`
- publishable files include the generated `bin/` output
- a build script exists for generating the bundled artifact before publish
- an engines constraint can express the supported runtime floor (`node >= 24`)

## Runtime Design

The published executable must use runtime APIs that are valid in both Node and Bun.

### `src/registry.ts`

- keep the current `fetch`-based design
- rely on standard `fetch`, available in Node 24+ and Bun

### `src/scaffold.ts`

- replace `Bun.write` usage with `node:fs/promises`
- preserve the same externally visible behavior:
  - create a temp directory
  - write `package.json`
  - write `index.js`
  - support idempotent cleanup

### `src/publish.ts`

- replace `Bun.$` usage with `node:child_process`
- keep the current `Commander` dependency-injection shape so tests stay focused
- preserve current behavior:
  - invoke `npm publish`
  - support `--dry-run`
  - propagate subprocess failures clearly

### `src/cli.ts`

- keep the current prompt flow and user-facing behavior
- adjust imports and execution assumptions so the module bundles cleanly
- continue orchestrating:
  1. npm availability check
  2. package name validation
  3. registry availability lookup
  4. metadata prompts
  5. preview
  6. dry-run short-circuit or publish
  7. temporary directory cleanup

## Data Flow

1. User runs `npx pkg-claim`, `node bin/pkg-claim.js`, or `bun bin/pkg-claim.js`
2. The generated `bin/pkg-claim.js` starts the CLI
3. The CLI validates the requested package name
4. The CLI checks npm registry availability
5. The CLI collects package metadata
6. The CLI creates a temporary minimal package on disk
7. The CLI executes `npm publish` or `npm publish --dry-run`
8. The CLI removes the temporary package directory

## Error Handling

- registry lookup failures remain explicit and user-visible
- subprocess failures from `npm publish` remain explicit and user-visible
- cleanup runs in a `finally` path
- there is no Bun-missing fallback path because the published runtime no longer requires Bun

## Testing Strategy

### Existing Tests

Keep the existing unit coverage for:

- registry availability checks
- scaffolded package generation
- publish command construction

Update tests only where runtime API changes require it.

### New or Updated Coverage

Add or update tests to verify:

1. `scaffold.ts` still generates the same file content after moving from Bun file APIs to Node file APIs
2. `publish.ts` still delegates correctly after moving from `Bun.$` to `node:child_process`
3. package metadata points the executable to `bin/pkg-claim.js`

### Build and Smoke Verification

Verify:

- the bundle is produced successfully into `bin/pkg-claim.js`
- `node bin/pkg-claim.js --dry-run` works
- `bun bin/pkg-claim.js --dry-run` works
- the package remains publishable with the generated artifact included

## Scope Boundaries

This design is intentionally limited to distribution and runtime portability.

It does not include:

- UX redesign
- new CLI features
- changes to the publish workflow itself
- support for old Node versions below 24

## Risks and Mitigations

### Risk: bundler output changes runtime semantics

Mitigation:

- keep module boundaries small and stable
- verify both Node and Bun smoke paths using the generated artifact

### Risk: runtime refactor breaks tests

Mitigation:

- preserve current public interfaces
- update tests before changing implementation behavior

### Risk: generated artifact drifts from source expectations

Mitigation:

- make the build step explicit in package scripts
- verify the generated `bin/` output before publish

## Implementation Notes

- source remains in TypeScript under `src/`
- published runtime artifact lives in `bin/`
- runtime compatibility target is Node 24+
- Bun remains acceptable for development workflows, but not required at execution time
