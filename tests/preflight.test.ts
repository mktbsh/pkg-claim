import { test, expect, mock } from "bun:test";
import { getNpmIdentity, requireNonInteractivePublishConfirmation } from "../src/preflight";
import type { CommandExecutor } from "../src/command";

test("getNpmIdentity returns npm username on success", async () => {
  const mockExec: CommandExecutor = mock(async () => ({
    exitCode: 0,
    stdout: "alice\n",
    stderr: "",
  }));

  await expect(getNpmIdentity(mockExec)).resolves.toBe("alice");
});

test("getNpmIdentity throws helpful error on failure", async () => {
  const mockExec: CommandExecutor = mock(async () => ({
    exitCode: 1,
    stdout: "",
    stderr: "whoami: not logged in\n",
  }));

  await expect(getNpmIdentity(mockExec)).rejects.toThrow(
    "Could not confirm the active npm account. Run npm login and try again."
  );
});

test("requireNonInteractivePublishConfirmation returns when interactive (noInput=false)", () => {
  expect(() =>
    requireNonInteractivePublishConfirmation({
      name: "pkg",
      dryRun: false,
      noInput: false,
    })
  ).not.toThrow();
});

test("requireNonInteractivePublishConfirmation returns when dryRun is true even if noInput is true", () => {
  expect(() =>
    requireNonInteractivePublishConfirmation({
      name: "pkg",
      dryRun: true,
      noInput: true,
    })
  ).not.toThrow();
});

test("requireNonInteractivePublishConfirmation throws when noInput and missing confirmName", () => {
  expect(() =>
    requireNonInteractivePublishConfirmation({
      name: "pkg",
      dryRun: false,
      noInput: true,
    })
  ).toThrow(
    "--confirm-name <package-name> is required when publishing with --no-input."
  );
});

test("requireNonInteractivePublishConfirmation throws when non-interactive without --no-input and missing confirmName", () => {
  expect(() =>
    requireNonInteractivePublishConfirmation({
      name: "pkg",
      dryRun: false,
      noInput: false,
      isInteractive: false,
    })
  ).toThrow("--confirm-name <package-name> is required in non-interactive mode.");
});

test("requireNonInteractivePublishConfirmation throws when names do not match", () => {
  expect(() =>
    requireNonInteractivePublishConfirmation({
      name: "pkg",
      confirmName: "other",
      dryRun: false,
      noInput: true,
    })
  ).toThrow("--name and --confirm-name must match exactly.");
});

test("requireNonInteractivePublishConfirmation returns when names match", () => {
  expect(() =>
    requireNonInteractivePublishConfirmation({
      name: "pkg",
      confirmName: "pkg",
      dryRun: false,
      noInput: true,
    })
  ).not.toThrow();
});
