import { expect, test } from "bun:test";

test("README documents the changesets release flow", async () => {
  const readme = await Bun.file(new URL("../README.md", import.meta.url)).text();

  expect(readme).toContain("bun run changeset");
  expect(readme).toContain("release PR");
  expect(readme).toContain("GitHub Actions");
  expect(readme).toContain("Trusted Publishing");
});
