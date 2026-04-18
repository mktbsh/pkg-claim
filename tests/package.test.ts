import { test, expect } from "bun:test";

test("publishes the bundled CLI from bin", async () => {
  const pkg = JSON.parse(
    await Bun.file(new URL("../package.json", import.meta.url)).text()
  );

  expect(pkg.bin["pkg-claim"]).toBe("./bin/pkg-claim.js");
  expect(pkg.files).toContain("bin/");
  expect(pkg.engines.node).toBe(">=24");
});

test("cli source keeps a node shebang for the bundled executable", async () => {
  const cli = await Bun.file(new URL("../src/cli.ts", import.meta.url)).text();

  expect(cli.startsWith("#!/usr/bin/env node")).toBe(true);
});
