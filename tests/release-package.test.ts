import { expect, test } from "bun:test";

test("package.json exposes the changesets release scripts", async () => {
  const pkg = JSON.parse(
    await Bun.file(new URL("../package.json", import.meta.url)).text()
  );

  expect(pkg.scripts.check).toBe("bun test && bun run typecheck && bun run build");
  expect(pkg.scripts.changeset).toBe("changeset");
  expect(pkg.scripts["version-packages"]).toBe("changeset version");
  expect(pkg.scripts.release).toBe("bun run check && changeset publish");
  expect(pkg.devDependencies["@changesets/cli"]).toBeDefined();
});

test("changesets config matches the main-branch release PR flow", async () => {
  const config = JSON.parse(
    await Bun.file(new URL("../.changeset/config.json", import.meta.url)).text()
  );
  const readme = await Bun.file(
    new URL("../.changeset/README.md", import.meta.url)
  ).text();

  expect(config.access).toBe("public");
  expect(config.baseBranch).toBe("main");
  expect(config.changelog).toBe(false);
  expect(config.commit).toBe(false);
  expect(readme).toContain("Use `bun run changeset` to add a release note");
  expect(readme).toContain("release PR");
});
