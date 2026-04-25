import { expect, test } from "bun:test";
import { HELP } from "../src/args";
import { runPkgClaim } from "../src/app";

function createTestDeps() {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    deps: {
      stdout: {
        write(chunk: string) {
          stdout.push(chunk);
        },
      },
      stderr: {
        write(chunk: string) {
          stderr.push(chunk);
        },
      },
      stdinIsTTY: false,
    },
    getStdout() {
      return stdout.join("");
    },
    getStderr() {
      return stderr.join("");
    },
  };
}

test("runPkgClaim prints help to stdout and returns 0", async () => {
  const { deps, getStdout, getStderr } = createTestDeps();

  await expect(runPkgClaim(["--help"], deps)).resolves.toBe(0);
  expect(getStdout()).toBe(HELP);
  expect(getStderr()).toBe("");
});

test("runPkgClaim requires --name in non-interactive mode", async () => {
  const { deps, getStdout, getStderr } = createTestDeps();

  await expect(runPkgClaim(["--no-input"], deps)).resolves.toBe(1);
  expect(getStdout()).toBe("");
  expect(getStderr()).toBe(
    "Error: --name is required in non-interactive mode.\nRun pkg-claim --help for usage.\n"
  );
});
