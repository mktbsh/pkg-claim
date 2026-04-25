import { test, expect, mock } from "bun:test";
import {
  ensureCommandAvailable,
  readCommandText,
  runCommand,
  runInteractiveCommand,
  type CommandExecutor,
  type InteractiveCommandExecutor,
} from "../src/command";

test("runCommand forwards command, args, and cwd to the executor", async () => {
  const calls: Array<{ command: string; args: string[]; cwd?: string }> = [];
  const executor: CommandExecutor = mock(async (command, args, cwd) => {
    calls.push({ command, args, cwd });
    return { exitCode: 0, stdout: "", stderr: "" };
  });

  const result = await runCommand("npm", ["publish"], "/tmp/pkg", executor);

  expect(result.exitCode).toBe(0);
  expect(calls).toEqual([
    { command: "npm", args: ["publish"], cwd: "/tmp/pkg" },
  ]);
});

test("readCommandText trims stdout", async () => {
  const executor: CommandExecutor = mock(async () => ({
    exitCode: 0,
    stdout: "takumi\n",
    stderr: "",
  }));

  expect(await readCommandText("git", ["config", "user.name"], executor)).toBe(
    "takumi"
  );
});

test("ensureCommandAvailable throws a friendly error when the command is missing", async () => {
  const executor: CommandExecutor = mock(async () => ({
    exitCode: 1,
    stdout: "",
    stderr: "not found",
  }));

  await expect(ensureCommandAvailable("npm", executor)).rejects.toThrow(
    "npm is not installed or not in PATH"
  );
});

test("runInteractiveCommand forwards command, args, and cwd to the executor", async () => {
  const calls: Array<{ command: string; args: string[]; cwd?: string }> = [];
  const executor: InteractiveCommandExecutor = mock(async (command, args, cwd) => {
    calls.push({ command, args, cwd });
    return 0;
  });

  const exitCode = await runInteractiveCommand(
    "npm",
    ["publish"],
    "/tmp/pkg",
    executor
  );

  expect(exitCode).toBe(0);
  expect(calls).toEqual([
    { command: "npm", args: ["publish"], cwd: "/tmp/pkg" },
  ]);
});
