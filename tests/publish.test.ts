import { test, expect, mock } from "bun:test";
import { publish, type Commander } from "../src/publish";

test("calls npm publish without --dry-run when dryRun is false", async () => {
  const calls: { args: string[]; cwd: string }[] = [];
  const mockCmd: Commander = mock(async (args, cwd) => {
    calls.push({ args, cwd });
  });

  await publish({ dir: "/tmp/test-dir", dryRun: false }, mockCmd);

  expect(calls).toHaveLength(1);
  expect(calls[0].args).toContain("publish");
  expect(calls[0].args).not.toContain("--dry-run");
  expect(calls[0].cwd).toBe("/tmp/test-dir");
});

test("calls npm publish with --dry-run when dryRun is true", async () => {
  const calls: { args: string[]; cwd: string }[] = [];
  const mockCmd: Commander = mock(async (args, cwd) => {
    calls.push({ args, cwd });
  });

  await publish({ dir: "/tmp/test-dir", dryRun: true }, mockCmd);

  expect(calls[0].args).toContain("--dry-run");
});

test("propagates error thrown by commander", async () => {
  const mockCmd: Commander = mock(async () => {
    throw new Error("npm ERR! 403 Forbidden");
  });

  await expect(
    publish({ dir: "/tmp/test-dir", dryRun: false }, mockCmd)
  ).rejects.toThrow("npm ERR! 403 Forbidden");
});
