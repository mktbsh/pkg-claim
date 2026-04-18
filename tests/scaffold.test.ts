import { test, expect } from "bun:test";
import { createTempPackage, removeTempPackage, type PackageMeta } from "../src/scaffold";
import { join } from "node:path";
import { stat } from "node:fs/promises";

const meta: PackageMeta = {
  name: "test-package",
  version: "0.0.1",
  description: "Test description",
  license: "MIT",
  author: "Test User <test@example.com>",
};

test("creates package.json with correct content", async () => {
  const dir = await createTempPackage(meta);

  const pkg = JSON.parse(await Bun.file(join(dir, "package.json")).text());
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

  const content = await Bun.file(join(dir, "index.js")).text();
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
