import { expect, test } from "bun:test";

test("ci workflow verifies pull requests with Bun", async () => {
  const workflow = await Bun.file(
    new URL("../.github/workflows/ci.yml", import.meta.url)
  ).text();

  expect(workflow).toContain("name: CI");
  expect(workflow).toContain("pull_request:");
  expect(workflow).toContain("uses: oven-sh/setup-bun@v2");
  expect(workflow).toContain("bun-version: latest");
  expect(workflow).toContain("bun install --frozen-lockfile");
  expect(workflow).toContain("bun test");
  expect(workflow).toContain("bun run typecheck");
  expect(workflow).toContain("bun run build");
});

test("publish workflow uses changesets and npm trusted publishing", async () => {
  const workflow = await Bun.file(
    new URL("../.github/workflows/publish.yml", import.meta.url)
  ).text();

  expect(workflow).toContain("name: Publish npm package");
  expect(workflow).toContain("push:");
  expect(workflow).toContain("branches:");
  expect(workflow).toContain("- main");
  expect(workflow).toContain(
    "concurrency: ${{ github.workflow }}-${{ github.ref }}"
  );
  expect(workflow).toContain("contents: write");
  expect(workflow).toContain("pull-requests: write");
  expect(workflow).toContain("id-token: write");
  expect(workflow).toContain("uses: actions/checkout@v4");
  expect(workflow).toContain("fetch-depth: 0");
  expect(workflow).toContain("uses: oven-sh/setup-bun@v2");
  expect(workflow).toContain("bun-version: latest");
  expect(workflow).toContain("bun install --frozen-lockfile");
  expect(workflow).toContain("uses: actions/setup-node@v4");
  expect(workflow).toContain("node-version: 24");
  expect(workflow).toContain("registry-url: https://registry.npmjs.org");
  expect(workflow).toContain("provenance: true");
  expect(workflow).toContain("uses: changesets/action@v1");
  expect(workflow).toContain("version: bun run version-packages");
  expect(workflow).toContain("publish: bun run release");
});
