import { test, expect } from "bun:test";
import { createTempPackage, removeTempPackage, type PackageMeta } from "../src/scaffold";
import { join } from "node:path";
import { readFile, stat } from "node:fs/promises";

const meta: PackageMeta = {
  name: "test-package",
  version: "0.0.1",
  description: "Test description",
  license: "MIT",
  author: "Test User <test@example.com>",
};

test("creates package.json with correct content", async () => {
  const dir = await createTempPackage(meta);

  const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
  expect(pkg.name).toBe("test-package");
  expect(pkg.version).toBe("0.0.1");
  expect(pkg.description).toBe("Test description");
  expect(pkg.license).toBe("MIT");
  expect(pkg.author).toBe("Test User <test@example.com>");
  expect(pkg.type).toBe("module");
  expect(pkg.exports).toBe("./index.js");

  await removeTempPackage(dir);
});

test("creates index.js with `export {};`", async () => {
  const dir = await createTempPackage(meta);

  const content = await readFile(join(dir, "index.js"), "utf8");
  expect(content.trim()).toBe("export {};");

  await removeTempPackage(dir);
});

test("removeTempPackage deletes the directory", async () => {
  const dir = await createTempPackage(meta);
  await removeTempPackage(dir);

  await expect(stat(dir)).rejects.toMatchObject({ code: "ENOENT" });
});

test("removeTempPackage is idempotent (no error on missing dir)", async () => {
  await expect(removeTempPackage("/tmp/nonexistent-pkg-claim-dir")).resolves.toBeUndefined();
});

test("creates files even when Bun globals are unavailable", async () => {
  const source = await readFile(join(process.cwd(), "src/scaffold.ts"), "utf8");
  const transpiled = new Bun.Transpiler({ loader: "ts" }).transformSync(source);
  const nodeScript = `
    import { mkdtemp, rm, readFile } from "node:fs/promises";
    import { tmpdir } from "node:os";
    import { join } from "node:path";

    const mod = await import("data:text/javascript,${encodeURIComponent(transpiled)}");
    const meta = ${JSON.stringify(meta)};
    const dir = await mod.createTempPackage(meta);
    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
    const indexJs = await readFile(join(dir, "index.js"), "utf8");

    if (pkg.name !== "test-package") throw new Error("unexpected package name");
    if (indexJs !== "export {};\\n") throw new Error("unexpected index.js content");

    await mod.removeTempPackage(dir);
  `;

  const result = Bun.spawnSync(["node", "--input-type=module", "-e", nodeScript]);
  expect(result.exitCode).toBe(0);
});
